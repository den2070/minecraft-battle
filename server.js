const express = require('express');
const { Client } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

// Твоя вечная база данных на Neon
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_q1vXnDhYPW0J@ep-summer-term-abdforvy-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const db = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к базе:', err.stack);
    } else {
        console.log('Успешно подключено к вечной базе данных PostgreSQL!');
        // Создаем таблицы в Neon, если их еще нет
        db.query(`CREATE TABLE IF NOT EXISTS players (
            id SERIAL PRIMARY KEY,
            nickname TEXT NOT NULL,
            ip TEXT NOT NULL UNIQUE
        );`);
        db.query(`CREATE TABLE IF NOT EXISTS matches (
            id SERIAL PRIMARY KEY,
            round INTEGER NOT NULL,
            player1 TEXT,
            player2 TEXT,
            winner TEXT
        );`);
    }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Главная страница с Canvas-анимацией (Зеленая матрица с яблочками)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Турнир ПГТ по Minecraft</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Courier New', Courier, monospace; overflow: hidden; background: #000; color: #fff; }
                canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }
                .container { 
                    position: relative; z-index: 2; 
                    display: flex; flex-direction: column; align-items: center; justify-content: center; 
                    height: 100vh; text-align: center; background: rgba(0, 0, 0, 0.6); padding: 20px;
                }
                h1 { font-size: 3rem; color: #55FF55; text-shadow: 3px 3px #005500; cursor: pointer; margin-bottom: 10px; }
                p { font-size: 1.2rem; margin-bottom: 20px; color: #EAA800; font-weight: bold; }
                input, button { padding: 15px; font-size: 18px; margin: 10px; border-radius: 5px; border: 2px solid #55FF55; }
                input { background: #222; color: #fff; text-align: center; width: 280px; }
                button { background: #55FF55; color: #000; font-weight: bold; cursor: pointer; transition: 0.2s; }
                button:hover { background: #ffaa00; border-color: #ffaa00; transform: scale(1.05); }
                .prize { color: #fff; font-size: 1.4rem; margin-top: 15px; border: 2px dashed #ffaa00; padding: 10px 20px; background: rgba(234,168,0,0.2); }
            </style>
        </head>
        <body>
            <canvas id="bgCanvas"></canvas>
            <div class="container">
                <h1 onclick="window.location='/admin-login'">🏆 MINECRAFT ТУРНИР 🏆</h1>
                <p>Заявка подается ОДИН раз!</p>
                <form action="/register" method="POST">
                    <input type="text" name="nickname" placeholder="Твой игровой ник" required minlength="3" maxlength="16" autocomplete="off">
                    <br>
                    <button type="submit">ЗАЛЕТЕТЬ НА ТУРНИР</button>
                </form>
                <div class="prize">Главный приз: ЛЕДЯНОЙ ЖИВЧИК 🍏🥤</div>
            </div>
            <script>
                const canvas = document.getElementById('bgCanvas');
                const ctx = canvas.getContext('2d');
                canvas.width = window.innerWidth; canvas.height = window.innerHeight;
                const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$@🍏";
                const charArr = chars.split(""); const fontSize = 16;
                const columns = canvas.width / fontSize; const drops = [];
                for (let x = 0; x < columns; x++) drops[x] = 1;
                function draw() {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                    for (let i = 0; i < drops.length; i++) {
                        const text = charArr[Math.floor(Math.random() * charArr.length)];
                        ctx.fillStyle = text === "🍏" ? "#FFCC00" : "#39FF14";
                        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                        drops[i]++;
                    }
                }
                window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
                setInterval(draw, 33);
            </script>
        </body>
        </html>
    `);
});

// Регистрация с защитой по IP
app.post('/register', async (req, res) => {
    const nickname = req.body.nickname.trim();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!nickname) return res.send('Ник пустой!');

    try {
        await db.query(`INSERT INTO players (nickname, ip) VALUES ($1, $2)`, [nickname, ip]);
        res.send(`<body style="background:#000;color:#55ff55;text-align:center;padding-top:100px;font-family:sans-serif;"><h2>🍏 Красава, ${nickname}! Твоя заявка принята. Жди сетку!</h2><br><a href="/" style="color:#fff;">Назад</a></body>`);
    } catch (err) {
        if (err.code === '23505') { // Ошибка дубликата IP в базе PostgreSQL
            return res.send('<body style="background:#000;color:#ff5555;text-align:center;padding-top:100px;font-family:sans-serif;"><h2>🛑 Ошибка: С твоего IP уже подана заявка!</h2><br><a href="/" style="color:#fff;">Назад</a></body>');
        }
        res.send('Ошибка при сохранении в базу данных.');
    }
});

// Страница авторизации админа
app.get('/admin-login', (req, res) => {
    res.send(`
        <body style="font-family:sans-serif; text-align:center; padding-top:100px; background:#111; color:#fff;">
            <h2>Вход в панель организатора ПГТ</h2><br>
            <form action="/admin" method="POST">
                <input type="text" name="username" placeholder="Логин" required style="padding:10px; margin:5px;"><br>
                <input type="password" name="password" placeholder="Пароль" required style="padding:10px; margin:5px;"><br>
                <button type="submit" style="padding:10px 20px; background:#55ff55; border:none; cursor:pointer;">Войти</button>
            </form>
        </body>
    `);
});

// Управление турниром
app.post('/admin', async (req, res) => {
    const { username, password } = req.body;
    if (username !== 'alopiska' || password !== 'minepro228') return res.send('Неверный логин или пароль!');

    try {
        const playersRes = await db.query(`SELECT * FROM players`);
        const matchesRes = await db.query(`SELECT * FROM matches`);
        
        let playersList = playersRes.rows.map(p => `<li><b>${p.nickname}</b> (IP: ${p.ip})</li>`).join('');
        let matchesList = matchesRes.rows.map(m => `
            <div style="border:1px solid #55ff55; padding:10px; margin:10px 0; background:#222;">
                <b>Круг ${m.round}:</b> ${m.player1} VS ${m.player2} <br>
                <b>Победитель:</b> <span style="color:#ffaa00">${m.winner || 'В процессе...'}</span>
                <form action="/admin/set-winner" method="POST" style="margin-top:5px;">
                    <input type="hidden" name="username" value="alopiska"><input type="hidden" name="password" value="minepro228">
                    <input type="hidden" name="match_id" value="${m.id}">
                    <select name="winner" style="padding:5px;">
                        <option value="${m.player1}">${m.player1}</option>
                        <option value="${m.player2}">${m.player2}</option>
                    </select>
                    <button type="submit" style="padding:5px; background:#ffaa00; border:none;">Победа</button>
                </form>
            </div>
        `).join('');

        res.send(`
            <body style="font-family:sans-serif; padding:20px; background:#111; color:#fff;">
                <h1>Панель Главного Админа</h1>
                <hr style="border-color:#333;">
                <h2>1. Создать пару</h2>
                <form action="/admin/create-match" method="POST" style="background:#222; padding:15px; border-radius:5px;">
                    <input type="hidden" name="username" value="alopiska"><input type="hidden" name="password" value="minepro228">
                    Круг (Раунд): <input type="number" name="round" value="1" style="width:50px; padding:5px;"><br><br>
                    Игрок 1: <select name="player1" style="padding:5px;">${playersRes.rows.map(p => `<option value="${p.nickname}">${p.nickname}</option>`).join('')}</select><br><br>
                    Игрок 2: <select name="player2" style="padding:5px;">${playersRes.rows.map(p => `<option value="${p.nickname}">${p.nickname}</option>`).join('')}</select><br><br>
                    <button type="submit" style="padding:10px; background:#55ff55; border:none; font-weight:bold;">Добавить</button>
                </form>
                <hr style="border-color:#333; margin:20px 0;">
                <h2>2. Турнирная сетка</h2>
                ${matchesList || '<p>Бои еще не добавлены</p>'}
                <hr style="border-color:#333; margin:20px 0;">
                <h2>3. Всего заявок: ${playersRes.rows.length}</h2>
                <ul>${playersList || 'Пока пусто'}</ul>
                <br><a href="/" style="color:#55ff55;">На главную</a>
            </body>
        `);
    } catch (err) {
        res.send('Ошибка загрузки данных из облака.');
    }
});

// Создание матча
app.post('/admin/create-match', async (req, res) => {
    const { username, password, round, player1, player2 } = req.body;
    if (username !== 'alopiska' || password !== 'minepro228') return res.send('Доступ запрещен');
    await db.query(`INSERT INTO matches (round, player1, player2) VALUES ($1, $2, $3)`, [round, player1, player2]);
    res.send('Пара создана! Обновите админку.');
});

// Запись победителя
app.post('/admin/set-winner', async (req, res) => {
    const { username, password, match_id, winner } = req.body;
    if (username !== 'alopiska' || password !== 'minepro228') return res.send('Доступ запрещен');
    await db.query(`UPDATE matches SET winner = $1 WHERE id = $2`, [winner, match_id]);
    res.send('Победитель записан! Обновите админку.');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
