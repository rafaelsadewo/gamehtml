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

    const editorInstructions = document.getElementById('editorInstructions');

    // Dapatkan ukuran dari CSS Variables untuk memastikan sinkronisasi
    const computedStyle = getComputedStyle(document.documentElement);
    // Menggunakan try-catch sebagai fallback yang lebih aman
    let CELL_SIZE = 40; // Default fallback
    let ROBOT_WIDTH = 45; // Default fallback
    let ROBOT_HEIGHT = 35; // Default fallback

    try {
        CELL_SIZE = parseInt(computedStyle.getPropertyValue('--grid-cell-size').replace('px', ''));
        ROBOT_WIDTH = parseInt(computedStyle.getPropertyValue('--robot-width').replace('px', ''));
        ROBOT_HEIGHT = parseInt(computedStyle.getPropertyValue('--robot-height').replace('px', ''));
    } catch (e) {
        // addLog("Warning: Could not read CSS variables for CELL_SIZE, ROBOT_WIDTH, or ROBOT_HEIGHT. Using fallback values. Error: " + e.message);
    }

    const GRID_SIZE = 10;

    let robotGridX, robotGridY;
    let currentDirection;

    let isEditMode = false;
    let currentMapData = {
        start: { x: 0, y: 0 },
        target: [{ x: 9, y: 9 }],
        obstacles: []
    };
    let editTool = 'obstacle';

    function updateRobotPosition() {
        const cellLeft = robotGridX * CELL_SIZE;
        const cellTop = robotGridY * CELL_SIZE;

        const offsetX = (CELL_SIZE - ROBOT_WIDTH) / 2;
        const offsetY = (CELL_SIZE - ROBOT_HEIGHT) / 2;

        robot.style.left = `${cellLeft + offsetX}px`;
        robot.style.top = `${cellTop + offsetY}px`;

        let rotation = 0;
        switch (currentDirection) {
            case 'up': rotation = 0; break;
            case 'right': rotation = 90; break;
            case 'down': rotation = 180; break;
            case 'left': rotation = 270; break; // Menggunakan 270 derajat untuk konsistensi
        }
        robot.style.transform = `rotate(${rotation}deg)`;
    }

    function addLog(message) {
        const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        logContent.textContent += `[${timestamp}] ${message}\n`;
        logContent.scrollTop = logContent.scrollHeight;
    }

    function drawArena(mapData) {
        Array.from(robotArena.children).forEach(child => {
            if (child.id !== 'robot') {
                child.remove();
            }
        });

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.x = x;
                cell.dataset.y = y;

                if (mapData.obstacles.some(obs => obs.x === x && obs.y === y)) {
                    const obstacleDiv = document.createElement('div');
                    obstacleDiv.classList.add('obstacle');
                    cell.appendChild(obstacleDiv);
                }

                const targetIndex = mapData.target.findIndex(tgt => tgt.x === x && tgt.y === y);
                if (targetIndex !== -1) {
                    const targetDiv = document.createElement('div');
                    targetDiv.classList.add('target');
                    targetDiv.textContent = `T${targetIndex + 1}`;
                    cell.appendChild(targetDiv);
                }

                if (mapData.start && mapData.start.x === x && mapData.start.y === y) {
                    const startIndicator = document.createElement('div');
                    startIndicator.classList.add('start-point-indicator');
                    cell.appendChild(startIndicator);
                }

                robotArena.appendChild(cell);
            }
        }
        robotArena.appendChild(robot);
        updateRobotPosition();
    }

    function loadMap(mapData) {
        currentMapData = JSON.parse(JSON.stringify(mapData));
        if (!currentMapData.start) {
            currentMapData.start = { x: 0, y: 0 };
        }
        if (!currentMapData.target || currentMapData.target.length === 0) {
            currentMapData.target = [{ x: GRID_SIZE - 1, y: GRID_SIZE - 1 }];
        }

        robotGridX = currentMapData.start.x;
        robotGridY = currentMapData.start.y;
        currentDirection = 'up';
        logContent.textContent = '';
        addLog("Peta dimuat. Robot direset.");
        currentMapInfo.textContent = 'Custom Map';

        drawArena(currentMapData);
    }

    function checkCollision(nextX, nextY, mapData) {
        if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
            addLog(`Tabrakan: Robot keluar batas di (${nextX},${nextY})!`);
            return 'out_of_bounds';
        }

        for (const obstacle of mapData.obstacles) {
            if (nextX === obstacle.x && nextY === obstacle.y) {
                addLog(`Tabrakan: Robot menabrak rintangan di (${nextX},${nextY})!`);
                return 'obstacle';
            }
        }
        return null;
    }

    function checkTarget(currentX, currentY, mapData) {
        return mapData.target.some(target => target.x === currentX && target.y === currentY);
    }

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
        let finalTargetReached = false; // Mengubah nama agar lebih jelas

        robotGridX = currentMapData.start.x;
        robotGridY = currentMapData.start.y;
        currentDirection = 'up';
        updateRobotPosition();
        await new Promise(resolve => setTimeout(resolve, 500));

        for (const command of commands) {
            if (collisionDetected) break; // Jika sudah tabrakan, hentikan eksekusi perintah berikutnya

            let executed = false;
            let nextX = robotGridX;
            let nextY = robotGridY;
            let steps = 1;

            const matchMaju = command.match(/^maju(?:\((\d+)\))?$/);
            const matchKanan = command.match(/^kanan(?:\((\d+)\))?$/);
            const matchKiri = command.match(/^kiri(?:\((\d+)\))?$/);
            const matchMundur = command.match(/^mundur(?:\((\d+)\))?$/);

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
                        // showMessage dipanggil setelah loop perintah utama selesai
                        break; // Keluar dari loop langkah 'maju'
                    }

                    robotGridX = nextX;
                    robotGridY = nextY;
                    updateRobotPosition();
                    addLog(`Robot maju (langkah ${i + 1}/${steps}). Posisi: (${robotGridX},${robotGridY})`);
                    await new Promise(resolve => setTimeout(resolve, 350));
                }
                executed = true;
            } else if (matchKanan) {
                steps = parseInt(matchKanan[1] || '1');
                for (let i = 0; i < steps; i++) {
                    switch (currentDirection) {
                        case 'up': currentDirection = 'right'; break;
                        case 'right': currentDirection = 'down'; break;
                        case 'down': currentDirection = 'left'; break;
                        case 'left': currentDirection = 'up'; break;
                    }
                    updateRobotPosition();
                    addLog(`Robot berbelok ke kanan (putar ${i + 1}/${steps} kali). Arah sekarang: ${currentDirection}`);
                    await new Promise(resolve => setTimeout(resolve, 350));
                }
                executed = true;
            } else if (matchKiri) {
                steps = parseInt(matchKiri[1] || '1');
                for (let i = 0; i < steps; i++) {
                    switch (currentDirection) {
                        case 'up': currentDirection = 'left'; break;
                        case 'left': currentDirection = 'down'; break;
                        case 'down': currentDirection = 'right'; break;
                        case 'right': currentDirection = 'up'; break;
                    }
                    updateRobotPosition();
                    addLog(`Robot berbelok ke kiri (putar ${i + 1}/${steps} kali). Arah sekarang: ${currentDirection}`);
                    await new Promise(resolve => setTimeout(resolve, 350));
                }
                executed = true;
            } else if (matchMundur) {
                steps = parseInt(matchMundur[1] || '1');
                for (let i = 0; i < steps; i++) {
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
                        // showMessage dipanggil setelah loop perintah utama selesai
                        break; // Keluar dari loop langkah 'mundur'
                    }
                    robotGridX = nextX;
                    robotGridY = nextY;
                    updateRobotPosition();
                    addLog(`Robot mundur (langkah ${i + 1}/${steps}). Posisi: (${robotGridX},${robotGridY})`);
                    await new Promise(resolve => setTimeout(resolve, 350));
                }
                executed = true;
            }

            if (!executed) {
                addLog(`Perintah tidak dikenal: "${command}"`);
            }
            if (collisionDetected) { // Periksa lagi setelah perintah selesai
                break; // Hentikan eksekusi perintah lebih lanjut jika terjadi tabrakan
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Tentukan hasil akhir dan tampilkan pop-up
        if (collisionDetected) {
            // Pesan tabrakan sudah ditampilkan di checkCollision, sekarang tampilkan pop-up umum
            showMessage('fail', 'GAGAL! Robot menabrak atau keluar batas.');
        } else {
            finalTargetReached = checkTarget(robotGridX, robotGridY, currentMapData);
            if (finalTargetReached) {
                addLog("Selamat! Robot berhasil mencapai target!");
                showMessage('success', 'BERHASIL! Misi Selesai!');
            } else {
                addLog("Eksekusi kode selesai. Robot belum mencapai target.");
                showMessage('fail', 'GAGAL! Target Belum Tercapai!');
            }
        }

        currentDirection = 'up'; // Reset arah robot setelah selesai
        updateRobotPosition();

        runButton.disabled = false;
        resetButton.disabled = false;
        editMapButton.disabled = false;
    });

    resetButton.addEventListener('click', () => {
        loadMap(currentMapData);
        addLog("__________________________________________________________________________________________");
        addLog("Robot direset ke posisi awal peta.");
    });

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
            loadMapButton.disabled = true;

            codeInput.style.display = 'none';
            runButton.style.display = 'none';
            resetButton.style.display = 'none';
            robot.style.display = 'none';
            editorInstructions.style.display = 'block';

            addLog("Memasuki Mode Edit Peta. Klik pada grid untuk menempatkan elemen.");
        } else {
            robotArena.classList.remove('edit-mode');
            editMapButton.textContent = 'Edit Peta';
            editMapButton.style.backgroundColor = '#ffc107';
            editMapButton.style.color = '#333';

            saveMapButton.style.display = 'none';
            clearMapButton.style.display = 'none';
            editModeTools.style.display = 'none';
            loadMapButton.disabled = false;

            codeInput.style.display = 'block';
            runButton.style.display = 'block';
            resetButton.style.display = 'block';
            robot.style.display = 'block';
            editorInstructions.style.display = 'none';

            addLog("Keluar dari Mode Edit Peta.");

            if (!currentMapData.start || !currentMapData.target || currentMapData.target.length === 0) {
                showMessage('fail', 'Peta yang diedit tidak valid! Perlu posisi awal dan setidaknya satu target.');
            }
            drawArena(currentMapData);
        }
    });

    editModeSelect.addEventListener('change', (event) => {
        editTool = event.target.value;
        addLog(`Mode edit: ${editTool}`);
    });

    robotArena.addEventListener('click', (event) => {
        if (!isEditMode) return;

        const cell = event.target.closest('.grid-cell');
        if (!cell) return;

        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        const pos = { x, y };

        const isObstacle = currentMapData.obstacles.some(o => o.x === x && o.y === y);
        const isTarget = currentMapData.target.some(t => t.x === x && t.y === y);
        const isStart = currentMapData.start && currentMapData.start.x === x && currentMapData.start.y === y;

        switch (editTool) {
            case 'obstacle':
                if (isStart || isTarget) {
                    addLog("Tidak bisa menempatkan rintangan di posisi awal atau target.");
                    break;
                }
                if (isObstacle) {
                    currentMapData.obstacles = currentMapData.obstacles.filter(o => !(o.x === x && o.y === y));
                    addLog(`Rintangan dihapus di (${x},${y})`);
                } else {
                    currentMapData.obstacles.push(pos);
                    addLog(`Rintangan ditambahkan di (${x},${y})`);
                }
                break;
            case 'target':
                if (isStart || isObstacle) {
                    addLog("Tidak bisa menempatkan target di posisi awal atau rintangan.");
                    break;
                }
                if (isTarget) {
                    currentMapData.target = currentMapData.target.filter(t => !(t.x === x && t.y === y));
                    addLog(`Target dihapus di (${x},${y})`);
                } else {
                    currentMapData.target.push(pos);
                    addLog(`Target ditambahkan di (${x},${y})`);
                }
                break;
            case 'start':
                if (isObstacle || isTarget) {
                    addLog("Tidak bisa menempatkan posisi awal di rintangan atau target.");
                    break;
                }
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
        drawArena(currentMapData);
    });

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

    clearMapButton.addEventListener('click', () => {
        currentMapData = {
            start: null,
            target: [],
            obstacles: []
        };
        drawArena(currentMapData);
        addLog("Peta dikosongkan. Harap atur posisi awal dan setidaknya satu target.");
        currentMapInfo.textContent = 'Empty Map';
    });

    try {
        const savedMap = localStorage.getItem('savedRoboMap');
        if (savedMap) {
            const loadedMapData = JSON.parse(savedMap);
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
