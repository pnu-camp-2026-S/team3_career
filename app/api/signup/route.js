import bcrypt from 'bcryptjs';

const usersDB = [];

export async function POST(request) {
  const { name, email, password } = await request.json();

  if (!name || !email || !password) {
    return Response.json({ message: '모든 필드를 입력해주세요.' }, { status: 400 });
  }

  const existingUser = usersDB.find((user) => user.email === email);
  if (existingUser) {
    return Response.json({ message: '이미 가입된 이메일입니다.' }, { status: 409 });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: usersDB.length + 1,
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    };

    usersDB.push(newUser);

    return Response.json({ message: '회원가입 성공', userId: newUser.id }, { status: 201 });
  } catch (error) {
    console.error('비밀번호 암호화 오류:', error);
    return Response.json({ message: '서버 내부 오류가 발생했습니다.' }, { status: 500 });
  }
}
