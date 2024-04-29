const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// MySQL 연결 정보
const db = mysql.createConnection({
    host: '127.0.0.1', // 또는 MySQL 호스트 주소
    port: '3306', // MySQL 포트 번호
    user: 'root',
    password: '0000',
    database: 'capstone'
});

// MySQL 연결
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL 데이터베이스에 연결되었습니다.');
});

// Body parser 미들웨어 추가
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 정적 파일들을 제공하기 위한 미들웨어
app.use(express.static(path.join(__dirname, 'static')));

// 세션 미들웨어 추가
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// 회원가입 페이지
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'register.html'));
});

// 회원가입 처리
app.post('/register', (req, res) => {
    const { name, username, password, phone } = req.body;

    // 사용자명(username) 중복 확인 쿼리
    const checkDuplicateQuery = `SELECT * FROM info WHERE username = ?`;
    db.query(checkDuplicateQuery, [username], (checkErr, checkResult) => {
        if (checkErr) {
            console.error('사용자명 중복 확인 중 오류 발생:', checkErr);
            res.status(500).send('회원가입 중 오류가 발생했습니다.');
        } else if (checkResult.length > 0) {
            // 사용자명이 이미 존재하는 경우
            res.status(400).send('이미 존재하는 사용자명입니다.');
        } else {
            // 사용자명이 중복되지 않은 경우, 회원가입 정보를 데이터베이스에 저장하는 쿼리
            const insertQuery = `INSERT INTO info (name, username, password, phone) VALUES (?, ?, ?, ?)`;
            db.query(insertQuery, [name, username, password, phone], (insertErr, insertResult) => {
                if (insertErr) {
                    console.error('회원가입 중 오류 발생:', insertErr);
                    res.status(500).send('회원가입 중 오류가 발생했습니다.');
                } else {
                    console.log('회원가입이 성공적으로 완료되었습니다.');
                    // 회원가입이 완료되면 인덱스 페이지로 리디렉션합니다.
                    res.redirect('/');
                }
            });
        }
    });
});

// 로그인 페이지
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'login.html'));
});

// 로그인 처리
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // 사용자명과 비밀번호를 데이터베이스에서 확인하는 쿼리
    const loginQuery = `SELECT * FROM info WHERE username = ? AND password = ?`;
    db.query(loginQuery, [username, password], (err, result) => {
        if (err) {
            console.error('로그인 중 오류 발생:', err);
            res.status(500).send('로그인 중 오류가 발생했습니다.');
        } else if (result.length === 0) {
            // 사용자명 또는 비밀번호가 일치하지 않는 경우
            res.status(401).send('사용자명 또는 비밀번호가 일치하지 않습니다.');
        } else {
            // 로그인이 성공한 경우
            req.session.username = username; // 세션에 사용자명 저장
            res.redirect('/'); // index.html로 리디렉션
        }
    });
});

// 로그아웃 처리
app.get('/logout', (req, res) => {
    // 세션을 파기하여 로그아웃 처리
    req.session.destroy((err) => {
        if (err) {
            console.error('로그아웃 중 오류 발생:', err);
            res.status(500).json({ success: false, error: '로그아웃 중 오류가 발생했습니다.' });
        } else {
            // 로그아웃이 성공한 경우, 클라이언트에게 성공 응답을 보냄
            res.json({ success: true });
        }
    });
});

// 마이페이지
app.get('/mypage', (req, res) => {
    // 로그인 여부 확인
    if (!req.session.username) {
        // 로그인되어 있지 않으면 로그인 페이지로 리디렉션
        res.redirect('/login');
    } else {
        // 로그인되어 있으면 마이페이지를 표시
        res.sendFile(path.join(__dirname, 'templates', 'mypage.html'));
    }
});

// 라우트를 통해 사용자 이름 반환
app.get('/getUsername', (req, res) => {
    // 현재 세션에서 사용자명 가져오기
    const username = req.session.username;
    // JSON 형태로 반환
    res.json({ username: username });
});

// 이미지를 서버에 업로드하고 데이터베이스에 저장하는 라우트
app.post('/saveImageWithUserInfo', (req, res) => {
    const { imageUrl, username } = req.body;

    // 이미지 URL을 서버에 저장
    const imagePath = `./uploads/${username}_${Date.now()}.png`; // 파일명을 유니크하게 설정
    const imageBuffer = Buffer.from(imageUrl, 'base64'); // base64 형식의 이미지를 Buffer로 변환
    fs.writeFile(imagePath, imageBuffer, (err) => {
        if (err) {
            console.error('이미지 저장 중 오류 발생:', err);
            res.status(500).json({ success: false, error: '이미지 저장 중 오류 발생' });
        } else {
            console.log('이미지가 성공적으로 서버에 저장되었습니다.');

            // 이미지 파일 경로를 데이터베이스에 저장하는 쿼리
            const insertQuery = `INSERT INTO saved_graphs (user_id, stock_code, graph_image) VALUES (?, ?, ?)`;
            db.query(insertQuery, [userId, stockCode, imagePath], (insertErr, insertResult) => {
                if (insertErr) {
                    console.error('이미지 및 사용자 정보를 데이터베이스에 저장하는 중 오류 발생:', insertErr);
                    res.status(500).json({ success: false, error: '이미지 및 사용자 정보를 데이터베이스에 저장하는 중 오류 발생' });
                } else {
                    console.log('이미지 및 사용자 정보가 성공적으로 데이터베이스에 저장되었습니다.');
                    res.json({ success: true });
                }
            });
        }
    });
});


// 각각의 메뉴 항목에 대한 라우팅
app.get('/page1', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'page1.html'));
});

app.get('/page2', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'page2.html'));
});

app.get('/page3', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'page3.html'));
});

app.get('/page4', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'page4.html'));
});

// 서버를 시작합니다.
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다!`);
});
