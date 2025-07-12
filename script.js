document.addEventListener('DOMContentLoaded', () => {
    // ... (deklarasi const lainnya) ...
    
    const codeInput = document.getElementById('codeInput');
    const runButton = document.getElementById('runButton');
    const resetButton = document.getElementById('resetButton');
    const robot = document.getElementById('robot');
    const robotArena = document.getElementById('robotArena');
    const logContent = document.getElementById('logContent');

    const editMapButton = document.getElementById('editMapButton');
    const saveMapButton = document.getElementById('saveMapButton');
    const loadMapButton = document.getElementById('loadMapButton');
    const clearMapButton = document.getElementById('clearMapButton');
    const editModeTools = document.querySelector('.edit-mode-tools');
    const editModeSelect = document.getElementById('editModeSelect');
    const currentMapInfo = document.getElementById('currentMapInfo');
    
    document.getElementById('currentMapInfo').parentElement.style.display = 'none';


    // --- Perubahan BARU di sini: Dapatkan elemen instruksi editor ---
    const editorInstructions = document.getElementById('editorInstructions');
    // --- Akhir perubahan BARU ---

    const GRID_SIZE = 10;
    const CELL_SIZE = 40;

    let robotGridX, robotGridY;
    let currentDirection; // 'up', 'right', 'down', 'left'

    let isEditMode = false;
    let currentMapData = {
        start: { x: 0, y: 0 },
        target: [{ x: 9, y: 9 }],
        obstacles: []
    }; // Default map
    let editTool = 'obstacle'; // Default tool for map editing

    //posisi baru robot
    function updateRobotPosition() {
    const left = robotGridX * CELL_SIZE;
    const top = robotGridY * CELL_SIZE;

    // Gunakan getBoundingClientRect sebagai fallback
    let robotWidth = robot.offsetWidth;
    let robotHeight = robot.offsetHeight;

    if (robotWidth === 0 || robotHeight === 0) {
        const rect = robot.getBoundingClientRect();
        robotWidth = rect.width;
        robotHeight = rect.height;
    }

    robot.style.left = `${left + (CELL_SIZE - robotWidth) / 2}px`;
    robot.style.top = `${top + (CELL_SIZE - robotHeight) / 2}px`;

    let rotation = 0;
    switch (currentDirection) {
        case 'up': rotation = 0; break;
        case 'right': rotation = 90; break;
        case 'down': rotation = 180; break;
        case 'left': rotation = 270; break;
    }

    robot.style.transformOrigin = 'center center';
    robot.style.transform = `rotate(${rotation}deg)`;
}


    //tambah log
    function addLog(message) {
        const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        logContent.textContent += `[${timestamp}] ${message}\n`;
        logContent.scrollTop = logContent.scrollHeight;
    }

    // Fungsi untuk menggambar arena (grid, rintangan, target, start point)
    function drawArena(mapData) {
        // Hapus semua child dari robotArena kecuali robot itu sendiri jika sudah ada
        Array.from(robotArena.children).forEach(child => {
            if (child.id !== 'robot') {
                child.remove();
            }
        });

        // Gambar grid dan tempatkan elemen di dalamnya
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.x = x;
                cell.dataset.y = y;

                // Tambahkan rintangan jika ada di posisi ini
                if (mapData.obstacles.some(obs => obs.x === x && obs.y === y)) {
                    const obstacleDiv = document.createElement('div');
                    obstacleDiv.classList.add('obstacle');
                    cell.appendChild(obstacleDiv);
                }

                // Tambahkan target jika ada di posisi ini
                const targetIndex = mapData.target.findIndex(tgt => tgt.x === x && tgt.y === y);
                if (targetIndex !== -1) {
                    const targetDiv = document.createElement('div');
                    targetDiv.classList.add('target');
                    targetDiv.textContent = `T${targetIndex + 1}`;
                    cell.appendChild(targetDiv);
                }

                // Tambahkan indikator posisi awal jika ada di posisi ini
                if (mapData.start && mapData.start.x === x && mapData.start.y === y) {
                    const startIndicator = document.createElement('div');
                    startIndicator.classList.add('start-point-indicator');
                    cell.appendChild(startIndicator);
                }

                robotArena.appendChild(cell);
            }
        }

        // Posisikan robot di atas grid
        robotArena.appendChild(robot);
        updateRobotPosition();
    }

    // Fungsi untuk memuat peta
    function loadMap(mapData) {
        currentMapData = JSON.parse(JSON.stringify(mapData)); // Deep copy
        // Pastikan start point ada, jika tidak, set default atau kosongkan
        if (!currentMapData.start) {
            currentMapData.start = { x: 0, y: 0 }; // Default jika tidak ada
        }
        if (!currentMapData.target || currentMapData.target.length === 0) {
            currentMapData.target = [{ x: GRID_SIZE - 1, y: GRID_SIZE - 1 }]; // Default jika tidak ada
        }


        robotGridX = currentMapData.start.x;
        robotGridY = currentMapData.start.y;
        currentDirection = 'up'; // Arah awal default
        logContent.textContent = '';
        addLog("Peta dimuat. Robot direset.");
        currentMapInfo.textContent = 'Custom Map'; // Update info map

        drawArena(currentMapData);
    }

    // Fungsi cek tabrakan
    function checkCollision(nextX, nextY, mapData) {
        // Cek keluar batas arena
        if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
            addLog(`Tabrakan: Robot keluar batas di (${nextX},${nextY})!`);
            return 'out_of_bounds';
        }

        // Cek tabrakan dengan rintangan
        for (const obstacle of mapData.obstacles) {
            if (nextX === obstacle.x && nextY === obstacle.y) {
                addLog(`Tabrakan: Robot menabrak rintangan di (${nextX},${nextY})!`);
                return 'obstacle';
            }
        }
        return null;
    }

    // Fungsi cek mencapai target
    function checkTarget(currentX, currentY, mapData) {
        return mapData.target.some(target => target.x === currentX && target.y === currentY);
    }

    // Fungsi tampilkan pesan
    function showMessage(type, message) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message');
        msgDiv.classList.add(`${type}-message`);
        msgDiv.textContent = message;
        document.body.appendChild(msgDiv);
        msgDiv.style.display = 'block';

        setTimeout(() => {
            msgDiv.style.display = 'none';
            msgDiv.remove();
        }, 3000);
    }

    // --- LOGIKA RUN CODE ---
    runButton.addEventListener('click', async () => {
        if (isEditMode) {
            showMessage('fail', 'Keluar dari Mode Edit untuk menjalankan kode!');
            return;
        }

        // Validasi map sebelum run
        if (!currentMapData.start || !currentMapData.target || currentMapData.target.length === 0) {
            showMessage('fail', 'Peta tidak valid! Pastikan ada posisi awal robot dan setidaknya satu target.');
            return;
        }

        runButton.disabled = true;
        resetButton.disabled = true;
        editMapButton.disabled = true;

        const code = codeInput.value;
        const commands = code.split('\n').map(cmd => cmd.trim()).filter(cmd => cmd !== '');
        addLog("Memulai eksekusi kode...");

        let collisionDetected = false;
        let targetReached = false;

        // Reset robot ke posisi awal peta yang sedang dimuat
        robotGridX = currentMapData.start.x;
        robotGridY = currentMapData.start.y;
        currentDirection = 'up';
        updateRobotPosition();
        await new Promise(resolve => setTimeout(resolve, 500));

        for (const command of commands) {
            if (collisionDetected || targetReached) break;

            let executed = false;
            let nextX = robotGridX;
            let nextY = robotGridY;
            let steps = 1;

            const matchMaju = command.match(/^maju(?:\((\d+)\))?$/);
            if (matchMaju) {
                steps = parseInt(matchMaju[1] || '1');
                for (let i = 0; i < steps; i++) {
                    nextX = robotGridX;
                    nextY = robotGridY;
                    switch (currentDirection) {
                        case 'up': nextY--; break;
                        case 'right': nextX++; break;
                        case 'down': nextY++; break;
                        case 'left': nextX--; break;
                    }

                    const collision = checkCollision(nextX, nextY, currentMapData);
                    if (collision) {
                        collisionDetected = true;
                        if (collision === 'out_of_bounds') {
                            showMessage('fail', 'Robot keluar batas!');
                        } else if (collision === 'obstacle') {
                            showMessage('fail', 'Robot menabrak rintangan!');
                        }
                        break;
                    }

                    robotGridX = nextX;
                    robotGridY = nextY;
                    updateRobotPosition();
                    addLog(`Robot maju (langkah ${i + 1}/${steps}). Posisi: (${robotGridX},${robotGridY})`);
                    if (checkTarget(robotGridX, robotGridY, currentMapData)) {
                        targetReached = true;
                        addLog("Robot mencapai target!");
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 350));
                }
                executed = true;
            } else if (command === 'kanan') {
                switch (currentDirection) {
                    case 'up': currentDirection = 'right'; break;
                    case 'right': currentDirection = 'down'; break;
                    case 'down': currentDirection = 'left'; break;
                    case 'left': currentDirection = 'up'; break;
                }
                updateRobotPosition();
                addLog(`Robot berbelok ke ${command}.\nArah sekarang: ${currentDirection}`);
                executed = true;
            } else if (command === 'kiri') {
                switch (currentDirection) {
                    case 'up': currentDirection = 'left'; break;
                    case 'left': currentDirection = 'down'; break;
                    case 'down': currentDirection = 'right'; break;
                    case 'right': currentDirection = 'up'; break;
                }
                updateRobotPosition();
                addLog(`Robot berbelok ke ${command}.\nArah sekarang: ${currentDirection}`);
                executed = true;
            } else if (command === 'mundur') {
                nextX = robotGridX;
                nextY = robotGridY;
                switch (currentDirection) {
                    case 'up': nextY++; break;
                    case 'right': nextX--; break;
                    case 'down': nextY--; break;
                    case 'left': nextX++; break;
                }

                const collision = checkCollision(nextX, nextY, currentMapData);
                if (collision) {
                    collisionDetected = true;
                    if (collision === 'out_of_bounds') {
                        showMessage('fail', 'Robot keluar batas!');
                    } else if (collision === 'obstacle') {
                        showMessage('fail', 'Robot menabrak rintangan!');
                    }
                    break;
                }
                robotGridX = nextX;
                robotGridY = nextY;
                updateRobotPosition();
                addLog(`Robot ${command}. Posisi: (${robotGridX},${robotGridY})`);
                if (checkTarget(robotGridX, robotGridY, currentMapData)) {
                    targetReached = true;
                    addLog("Robot mencapai target!");
                }
                executed = true;
            }

            if (!executed) {
                addLog(`Perintah tidak dikenal: "${command}"`);
            }
            if (!collisionDetected && !targetReached) {
                await new Promise(resolve => setTimeout(resolve, 200));
            } else {
                break;
            }
        }

        if (!collisionDetected && targetReached) {
            addLog("Selamat! Robot berhasil mencapai target!");
            showMessage('success', 'Misi Selesai!');
        } else if (!collisionDetected && !targetReached) {
            addLog("Eksekusi kode selesai. Robot belum mencapai target.");
            showMessage('fail', 'Target Belum Tercapai!');
        }

        runButton.disabled = false;
        resetButton.disabled = false;
        editMapButton.disabled = false;
    });

    resetButton.addEventListener('click', () => {
        loadMap(currentMapData);
        addLog("__________________________________________________________________________________________");
        addLog("Robot direset ke posisi awal peta.");
    });

    // --- LOGIKA MAP EDITOR ---

    // Toggle Edit Mode
    editMapButton.addEventListener('click', () => {
        isEditMode = !isEditMode;
        if (isEditMode) {
            robotArena.classList.add('edit-mode');
            editMapButton.textContent = 'Keluar Mode Edit';
            editMapButton.style.backgroundColor = '#6c757d';
            editMapButton.style.color = 'white';

            saveMapButton.style.display = 'inline-block';
            clearMapButton.style.display = 'inline-block';
            editModeTools.style.display = 'block';
            loadMapButton.disabled = true; // Nonaktifkan load map saat edit

            // Sembunyikan elemen-elemen saat masuk mode edit
            codeInput.style.display = 'none';
            runButton.style.display = 'none';
            resetButton.style.display = 'none';
            robot.style.display = 'none'; // Sembunyikan gambar robot
            // --- Perubahan BARU di sini: Tampilkan instruksi editor ---
            editorInstructions.style.display = 'block';
            // --- Akhir perubahan BARU ---


            addLog("Memasuki Mode Edit Peta. Klik pada grid untuk menempatkan elemen.");
        } else {
            robotArena.classList.remove('edit-mode');
            editMapButton.textContent = 'Edit Peta';
            editMapButton.style.backgroundColor = '#ffc107';
            editMapButton.style.color = '#333';

            saveMapButton.style.display = 'none';
            clearMapButton.style.display = 'none';
            editModeTools.style.display = 'none';
            loadMapButton.disabled = false; // Aktifkan load map saat keluar edit

            // Tampilkan kembali elemen-elemen saat keluar mode edit
            codeInput.style.display = 'block';
            runButton.style.display = 'block';
            resetButton.style.display = 'block';
            robot.style.display = 'block'; // Tampilkan kembali gambar robot
            // --- Perubahan BARU di sini: Sembunyikan instruksi editor ---
            editorInstructions.style.display = 'none';
            // --- Akhir perubahan BARU ---


            addLog("Keluar dari Mode Edit Peta.");

            // Validasi peta setelah keluar dari edit mode
            if (!currentMapData.start || !currentMapData.target || currentMapData.target.length === 0) {
                showMessage('fail', 'Peta yang diedit tidak valid! Perlu posisi awal dan setidaknya satu target.');
            }
            drawArena(currentMapData); // Gambar ulang untuk memastikan robot di posisi awal yang benar dan bersih dari indikator edit
        }
    });

    editModeSelect.addEventListener('change', (event) => {
        editTool = event.target.value;
        addLog(`Mode edit: ${editTool}`);
    });

    // Click handler for map editing
    robotArena.addEventListener('click', (event) => {
        if (!isEditMode) return;

        // Pastikan klik terjadi pada .grid-cell, bukan pada elemen di dalamnya (rintangan/target/start-indicator)
        const cell = event.target.closest('.grid-cell');
        if (!cell) return;

        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        const pos = { x, y };

        // Cek apakah ada elemen di sel yang diklik
        const isObstacle = currentMapData.obstacles.some(o => o.x === x && o.y === y);
        const isTarget = currentMapData.target.some(t => t.x === x && t.y === y);
        const isStart = currentMapData.start && currentMapData.start.x === x && currentMapData.start.y === y;

        switch (editTool) {
            case 'obstacle':
                if (isStart || isTarget) {
                    addLog("Tidak bisa menempatkan rintangan di posisi awal atau target.");
                    break;
                }
                if (isObstacle) { // Jika sudah ada rintangan, hapus
                    currentMapData.obstacles = currentMapData.obstacles.filter(o => !(o.x === x && o.y === y));
                    addLog(`Rintangan dihapus di (${x},${y})`);
                } else { // Jika belum ada, tambahkan
                    currentMapData.obstacles.push(pos);
                    addLog(`Rintangan ditambahkan di (${x},${y})`);
                }
                break;
            case 'target':
                if (isStart || isObstacle) {
                    addLog("Tidak bisa menempatkan target di posisi awal atau rintangan.");
                    break;
                }
                if (isTarget) { // Jika sudah ada target, hapus
                    currentMapData.target = currentMapData.target.filter(t => !(t.x === x && t.y === y));
                    addLog(`Target dihapus di (${x},${y})`);
                } else { // Jika belum ada, tambahkan
                    currentMapData.target.push(pos);
                    addLog(`Target ditambahkan di (${x},${y})`);
                }
                break;
            case 'start':
                if (isObstacle || isTarget) {
                    addLog("Tidak bisa menempatkan posisi awal di rintangan atau target.");
                    break;
                }
                // Hapus posisi start yang lama jika ada
                if (currentMapData.start) {
                    addLog(`Posisi awal robot lama (${currentMapData.start.x},${currentMapData.start.y}) dihapus.`);
                }
                currentMapData.start = pos;
                addLog(`Posisi awal robot diatur ke (${x},${y})`);
                break;
            case 'erase':
                if (isObstacle) {
                    currentMapData.obstacles = currentMapData.obstacles.filter(o => !(o.x === x && o.y === y));
                    addLog(`Rintangan dihapus di (${x},${y})`);
                }
                if (isTarget) {
                    currentMapData.target = currentMapData.target.filter(t => !(t.x === x && t.y === y));
                    addLog(`Target dihapus di (${x},${y})`);
                }
                if (isStart) {
                    currentMapData.start = null;
                    addLog(`Posisi awal robot dihapus di (${x},${y})`);
                }
                if (!isObstacle && !isTarget && !isStart) {
                    addLog(`Tidak ada elemen di (${x},${y}) untuk dihapus.`);
                }
                break;
        }
        drawArena(currentMapData); // Gambar ulang arena setelah perubahan
    });

    // Save Map
    saveMapButton.addEventListener('click', () => {
        if (!currentMapData.start || !currentMapData.target || currentMapData.target.length === 0) {
            showMessage('fail', 'Tidak bisa menyimpan peta tidak valid! Perlu posisi awal robot dan setidaknya satu target.');
            return;
        }
        try {
            localStorage.setItem('savedRoboMap', JSON.stringify(currentMapData));
            showMessage('success', 'Peta berhasil disimpan!');
            addLog("Peta saat ini disimpan di browser.");
            currentMapInfo.textContent = 'Saved Custom Map';
        } catch (e) {
            showMessage('fail', 'Gagal menyimpan peta. Penyimpanan lokal mungkin penuh atau dinonaktifkan.');
            addLog("Error menyimpan peta: " + e.message);
        }
    });

    // Load Map
    loadMapButton.addEventListener('click', () => {
        try {
            const savedMap = localStorage.getItem('savedRoboMap');
            if (savedMap) {
                const loadedMapData = JSON.parse(savedMap);
                if (loadedMapData.start && loadedMapData.target && loadedMapData.target.length > 0) {
                    loadMap(loadedMapData);
                    addLog("__________________________________________________________________________________________");
                    addLog("Peta tersimpan berhasil dimuat.");
                    showMessage('success', 'Peta dimuat!');
                    currentMapInfo.textContent = 'Loaded Custom Map';
                } else {
                    showMessage('fail', 'Peta tersimpan tidak valid atau rusak. Menggunakan peta default.');
                    addLog("__________________________________________________________________________________________");
                    addLog("Peta tersimpan tidak valid, menggunakan peta default.");
                    loadMap({
                        start: { x: 0, y: 0 },
                        target: [{ x: GRID_SIZE - 1, y: GRID_SIZE - 1 }],
                        obstacles: []
                    });
                }
            } else {
                showMessage('fail', 'Tidak ada peta tersimpan!');
                addLog("Tidak ada peta tersimpan di browser, menggunakan peta default.");
                loadMap({
                    start: { x: 0, y: 0 },
                    target: [{ x: GRID_SIZE - 1, y: GRID_SIZE - 1 }],
                    obstacles: []
                });
            }
        } catch (e) {
            showMessage('fail', 'Gagal memuat peta. Data mungkin rusak. Menggunakan peta default.');
            addLog("Error memuat peta: " + e.message + ". Menggunakan peta default.");
            loadMap({
                start: { x: 0, y: 0 },
                target: [{ x: GRID_SIZE - 1, y: GRID_SIZE - 1 }],
                obstacles: []
            });
        }
    });

    // Clear Map
    clearMapButton.addEventListener('click', () => {
        currentMapData = {
            start: null, // Set null agar pengguna harus menentukan
            target: [], // Kosongkan agar pengguna harus menentukan
            obstacles: []
        };
        drawArena(currentMapData);
        addLog("Peta dikosongkan. Harap atur posisi awal dan setidaknya satu target.");
        currentMapInfo.textContent = 'Empty Map';
    });

    // Inisialisasi: Coba muat peta yang disimpan saat halaman pertama kali dimuat
    // Jika tidak ada atau error, gunakan peta default
    try {
        const savedMap = localStorage.getItem('savedRoboMap');
        if (savedMap) {
            const loadedMapData = JSON.parse(savedMap);
            // Validasi dasar saat startup
            if (loadedMapData.start && loadedMapData.target && loadedMapData.target.length > 0) {
                loadMap(loadedMapData);
                addLog("__________________________________________________________________________________________");
                addLog("Peta tersimpan otomatis dimuat saat startup atau menggunakan save sebelumnya");
                currentMapInfo.textContent = 'Loaded Custom Map';
            } else {
                addLog("Peta tersimpan tidak valid saat startup, menggunakan peta default.");
                loadMap({
                    start: { x: 0, y: 0 },
                    target: [{ x: GRID_SIZE - 1, y: GRID_SIZE - 1 }],
                    obstacles: []
                });
            }
        } else {
            addLog("Tidak ada peta tersimpan, menggunakan peta default.");
            loadMap({
                start: { x: 0, y: 0 },
                target: [{ x: GRID_SIZE - 1, y: GRID_SIZE - 1 }],
                obstacles: []
            });
        }
    } catch (e) {
        addLog("Gagal memuat peta tersimpan otomatis saat startup: " + e.message + ". Menggunakan peta default.");
        loadMap({
            start: { x: 0, y: 0 },
            target: [{ x: GRID_SIZE - 1, y: GRID_SIZE - 1 }],
            obstacles: []
        });
    }
});