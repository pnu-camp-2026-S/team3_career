// Supabase 기반 분석 산출물 저장소. LocalAnalysisRepository(repository.mjs)와
// 같은 메서드 시그니처를 유지하므로 service.mjs/aggregate.mjs는 수정 없이 동작한다.
// 원본 파일은 이미 Storage에 있으므로 saveOriginalFile은 저장하지 않는다.
// 모든 쿼리는 RLS에 더해 user_id 필터로 이중 방어한다(기존 API 라우트 패턴).

const FILE_ANALYSIS_COLUMNS =
  'id, activity_file_id, project_id, analysis_id, file_ref, status, stage, provider, metadata, analysis_result, summary_md, index_draft, log_md, errors, created_at, updated_at';

function throwIfError(error, action) {
  if (error) throw new Error(`분석 결과 저장소 오류(${action}): ${error.message}`);
}

export class DbAnalysisRepository {
  constructor({ supabase, userId, projectId = null, activityFile = null }) {
    this.supabase = supabase;
    this.userId = userId;
    this.projectId = projectId;
    this.activityFile = activityFile;
  }

  // 파일 1건 분석용 저장소를 파생한다. activityFile은 activity_files 행이다.
  forActivityFile(activityFile) {
    return new DbAnalysisRepository({
      supabase: this.supabase,
      userId: this.userId,
      projectId: this.projectId,
      activityFile,
    });
  }

  requireActivityFile() {
    if (!this.activityFile?.id) {
      throw new Error('분석 대상 activity_files 행이 지정되지 않았습니다.');
    }
    return this.activityFile;
  }

  async updateFileAnalysis(patch, action) {
    const activityFile = this.requireActivityFile();
    const { error } = await this.supabase
      .from('file_analyses')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('user_id', this.userId)
      .eq('activity_file_id', activityFile.id);
    throwIfError(error, action);
  }

  // 원본은 이미 Supabase Storage에 있으므로 저장하지 않고 기존 경로만 돌려준다.
  async saveOriginalFile() {
    const activityFile = this.requireActivityFile();
    return { storagePath: activityFile.storage_path };
  }

  // 서비스 흐름상 항상 첫 저장 지점이므로 upsert로 행을 만들고 상태를 갱신한다.
  async saveMetadata(metadata) {
    const activityFile = this.requireActivityFile();
    const { error } = await this.supabase
      .from('file_analyses')
      .upsert(
        {
          user_id: this.userId,
          activity_file_id: activityFile.id,
          project_id: this.projectId || activityFile.project_id || metadata.projectId,
          analysis_id: metadata.analysisId,
          file_ref: metadata.fileId,
          status: metadata.analysisStatus,
          metadata,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'activity_file_id' }
      );
    throwIfError(error, 'saveMetadata');
  }

  async saveExtractedText(fileId, text) {
    await this.updateFileAnalysis({ extracted_text: text }, 'saveExtractedText');
  }

  async saveAnalysisResult(result, provider = null) {
    await this.updateFileAnalysis(
      { analysis_result: result, provider: provider || null },
      'saveAnalysisResult'
    );
  }

  async saveSummaryMarkdown(analysisId, markdown) {
    await this.updateFileAnalysis({ summary_md: markdown }, 'saveSummaryMarkdown');
  }

  async saveIndexDraft(analysisId, indexDraft) {
    await this.updateFileAnalysis({ index_draft: indexDraft }, 'saveIndexDraft');
  }

  // 파일별 분석은 순차 실행이므로 읽고-이어붙여-저장해도 경합이 없다.
  async appendLog(analysisId, entryMarkdown) {
    const activityFile = this.requireActivityFile();
    const { data, error } = await this.supabase
      .from('file_analyses')
      .select('log_md')
      .eq('user_id', this.userId)
      .eq('activity_file_id', activityFile.id)
      .maybeSingle();
    throwIfError(error, 'appendLog');

    const existing = data?.log_md || '# 단일 파일 분석 로그\n';
    await this.updateFileAnalysis({ log_md: `${existing}\n${entryMarkdown}` }, 'appendLog');
  }

  // 실패 단계/오류 목록 기록(라우트 후처리용, Local 구현에는 없는 확장 메서드).
  async saveFailureDetails({ stage, errors }) {
    await this.updateFileAnalysis({ stage: stage || null, errors: errors || null }, 'saveFailureDetails');
  }

  rowToBundle(row) {
    if (!row?.metadata) return null;
    return {
      analysisId: row.analysis_id,
      activityFileId: row.activity_file_id,
      provider: row.provider || null,
      metadata: row.metadata,
      analysisResult: row.analysis_result,
      summaryMarkdown: row.summary_md || '',
      indexDraft: row.index_draft,
      logMarkdown: row.log_md || '',
    };
  }

  async getAnalysisBundle(analysisId) {
    const { data, error } = await this.supabase
      .from('file_analyses')
      .select(FILE_ANALYSIS_COLUMNS)
      .eq('user_id', this.userId)
      .eq('analysis_id', analysisId)
      .maybeSingle();
    throwIfError(error, 'getAnalysisBundle');
    return this.rowToBundle(data);
  }

  // projectId가 있으면 프로젝트 단위, 없으면 사용자 전체(메인 종합) 범위다.
  async listAnalysisBundles() {
    let query = this.supabase
      .from('file_analyses')
      .select(FILE_ANALYSIS_COLUMNS)
      .eq('user_id', this.userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });
    if (this.projectId) query = query.eq('project_id', this.projectId);

    const { data, error } = await query;
    throwIfError(error, 'listAnalysisBundles');
    return (data || []).map((row) => this.rowToBundle(row)).filter(Boolean);
  }

  aggregateScope() {
    return this.projectId
      ? { scope: 'project', project_id: this.projectId }
      : { scope: 'user', project_id: '' };
  }

  async saveAggregateResult(result) {
    const scope = this.aggregateScope();
    const { error } = await this.supabase
      .from('project_analyses')
      .upsert(
        {
          user_id: this.userId,
          ...scope,
          result,
          provider: result.provider || null,
          based_on_count: result.basedOnCount || 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,scope,project_id' }
      );
    throwIfError(error, 'saveAggregateResult');
  }

  async getAggregateResult() {
    const scope = this.aggregateScope();
    const { data, error } = await this.supabase
      .from('project_analyses')
      .select('result')
      .eq('user_id', this.userId)
      .eq('scope', scope.scope)
      .eq('project_id', scope.project_id)
      .maybeSingle();
    throwIfError(error, 'getAggregateResult');
    return data?.result || null;
  }
}
