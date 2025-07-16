// RoboCode Simulator - Full Script dengan Fix Target Overshoot

document.addEventListener('DOMContentLoaded', () => {
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
    const editorInstructions = document.getElementById('editorInstructions');

    document.getElementById('currentMapInfo').parentElement.style.display = 'none';

    const computedStyle = getComputedStyle(document.documentElement);
    let CELL_SIZE = 40;
    let ROBOT_WIDTH = 45;
    let ROBOT_HEIGHT = 35;

    try {
        CELL_SIZE = parseInt(computedStyle.getPropertyValue('--grid-cell-size').replace('px', ''));
        ROBOT_WIDTH = parseInt(computedStyle.getPropertyValue('--robot-width').replace('px', ''));
        ROBOT_HEIGHT = parseInt(computedStyle.getPropertyValue('--robot-height').replace('px', ''));
    } catch (e) {}

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
            case 'left': rotation = 270; break;
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
            if (child.id !== 'robot') child.remove();
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

    function checkCollision(x, y, mapData) {
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
            addLog(`Tabrakan: Robot keluar batas di (${x},${y})!`);
            return 'out_of_bounds';
        }
        for (const obs of mapData.obstacles) {
            if (x === obs.x && y === obs.y) {
                addLog(`Tabrakan: Robot menabrak rintangan di (${x},${y})!`);
                return 'obstacle';
            }
        }
        return null;
    }

    function checkTarget(x, y, mapData) {
        return mapData.target.some(t => t.x === x && t.y === y);
    }

    function showMessage(type, message) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', `${type}-message`);
        msgDiv.textContent = message;
        document.body.appendChild(msgDiv);
        setTimeout(() => msgDiv.remove(), 3000);
    }

    function loadMap(mapData) {
        currentMapData = JSON.parse(JSON.stringify(mapData));
        robotGridX = currentMapData.start?.x || 0;
        robotGridY = currentMapData.start?.y || 0;
        currentDirection = 'up';
        logContent.textContent = '';
        addLog("Peta dimuat. Robot direset.");
        drawArena(currentMapData);
    }

    runButton.addEventListener('click', async () => {
        if (isEditMode) return;
        if (!currentMapData.start || currentMapData.target.length === 0) {
            showMessage('fail', 'Peta tidak valid! Perlu posisi awal dan target.');
            return;
        }

        const code = codeInput.value;
        const commands = code.split('\n').map(cmd => cmd.trim()).filter(cmd => cmd !== '');

        robotGridX = currentMapData.start.x;
        robotGridY = currentMapData.start.y;
        currentDirection = 'up';
        updateRobotPosition();
        logContent.textContent = '';
        addLog("Memulai eksekusi kode...");

        let collisionDetected = false;
        let targetReached = false;

        for (const command of commands) {
            if (collisionDetected || targetReached) break;

            let executed = false;
            let steps = 1;
            let match;

            if ((match = command.match(/^maju(?:\((\d+)\))?$/))) {
                steps = parseInt(match[1] || '1');
                for (let i = 0; i < steps; i++) {
                    let nextX = robotGridX;
                    let nextY = robotGridY;
                    switch (currentDirection) {
                        case 'up': nextY--; break;
                        case 'right': nextX++; break;
                        case 'down': nextY++; break;
                        case 'left': nextX--; break;
                    }
                    const collision = checkCollision(nextX, nextY, currentMapData);
                    if (collision) {
                        collisionDetected = true;
                        break;
                    }
                    robotGridX = nextX;
                    robotGridY = nextY;
                    updateRobotPosition();
                    addLog(`Robot maju (langkah ${i + 1}/${steps}). Posisi: (${robotGridX},${robotGridY})`);
                    await new Promise(r => setTimeout(r, 350));
                }
                if (!collisionDetected && checkTarget(robotGridX, robotGridY, currentMapData)) {
                    targetReached = true;
                    addLog("Robot berhenti tepat di target!");
                }
                executed = true;
            } else if ((match = command.match(/^kanan(?:\((\d+)\))?$/))) {
                steps = parseInt(match[1] || '1');
                for (let i = 0; i < steps; i++) {
                    switch (currentDirection) {
                        case 'up': currentDirection = 'right'; break;
                        case 'right': currentDirection = 'down'; break;
                        case 'down': currentDirection = 'left'; break;
                        case 'left': currentDirection = 'up'; break;
                    }
                    updateRobotPosition();
                    addLog(`Robot berbelok ke kanan. Arah: ${currentDirection}`);
                    await new Promise(r => setTimeout(r, 350));
                }
                executed = true;
            } else if ((match = command.match(/^kiri(?:\((\d+)\))?$/))) {
                steps = parseInt(match[1] || '1');
                for (let i = 0; i < steps; i++) {
                    switch (currentDirection) {
                        case 'up': currentDirection = 'left'; break;
                        case 'left': currentDirection = 'down'; break;
                        case 'down': currentDirection = 'right'; break;
                        case 'right': currentDirection = 'up'; break;
                    }
                    updateRobotPosition();
                    addLog(`Robot berbelok ke kiri. Arah: ${currentDirection}`);
                    await new Promise(r => setTimeout(r, 350));
                }
                executed = true;
            } else if ((match = command.match(/^mundur(?:\((\d+)\))?$/))) {
                steps = parseInt(match[1] || '1');
                for (let i = 0; i < steps; i++) {
                    let nextX = robotGridX;
                    let nextY = robotGridY;
                    switch (currentDirection) {
                        case 'up': nextY++; break;
                        case 'right': nextX--; break;
                        case 'down': nextY--; break;
                        case 'left': nextX++; break;
                    }
                    const collision = checkCollision(nextX, nextY, currentMapData);
                    if (collision) {
                        collisionDetected = true;
                        break;
                    }
                    robotGridX = nextX;
                    robotGridY = nextY;
                    updateRobotPosition();
                    addLog(`Robot mundur (langkah ${i + 1}/${steps}). Posisi: (${robotGridX},${robotGridY})`);
                    await new Promise(r => setTimeout(r, 350));
                }
                if (!collisionDetected && checkTarget(robotGridX, robotGridY, currentMapData)) {
                    targetReached = true;
                    addLog("Robot berhenti tepat di target!");
                }
                executed = true;
            }

            if (!executed) addLog(`Perintah tidak dikenal: \"${command}\"`);
        }

        if (targetReached) showMessage('success', 'Misi Selesai!');
        else if (!collisionDetected) showMessage('fail', 'Target belum tercapai.');

        currentDirection = 'up';
        updateRobotPosition();
    });

    resetButton.addEventListener('click', () => {
        loadMap(currentMapData);
        logContent.textContent = '';
        addLog("Robot direset ke posisi awal.");
    });

    editMapButton.addEventListener('click', () => {
        isEditMode = !isEditMode;
        if (isEditMode) {
            robotArena.classList.add('edit-mode');
            editMapButton.textContent = 'Keluar Mode Edit';
            editorInstructions.style.display = 'block';
        } else {
            robotArena.classList.remove('edit-mode');
            editMapButton.textContent = 'Edit Peta';
            editorInstructions.style.display = 'none';
            drawArena(currentMapData);
        }
    });

    editModeSelect.addEventListener('change', (e) => {
        editTool = e.target.value;
    });

    robotArena.addEventListener('click', (e) => {
        if (!isEditMode) return;

        const cell = e.target.closest('.grid-cell');
        if (!cell) return;

        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);

        const isObstacle = currentMapData.obstacles.some(o => o.x === x && o.y === y);
        const isTarget = currentMapData.target.some(t => t.x === x && t.y === y);
        const isStart = currentMapData.start?.x === x && currentMapData.start?.y === y;

        switch (editTool) {
            case 'obstacle':
                if (!isObstacle) currentMapData.obstacles.push({ x, y });
                else currentMapData.obstacles = currentMapData.obstacles.filter(o => !(o.x === x && o.y === y));
                break;
            case 'target':
                if (!isTarget) currentMapData.target.push({ x, y });
                else currentMapData.target = currentMapData.target.filter(t => !(t.x === x && t.y === y));
                break;
            case 'start':
                currentMapData.start = { x, y };
                break;
        }
        drawArena(currentMapData);
    });

    saveMapButton.addEventListener('click', () => {
        localStorage.setItem('savedRoboMap', JSON.stringify(currentMapData));
        addLog("Peta disimpan.");
    });

    loadMapButton.addEventListener('click', () => {
        const saved = localStorage.getItem('savedRoboMap');
        if (saved) loadMap(JSON.parse(saved));
        else addLog("Tidak ada peta tersimpan.");
    });

    clearMapButton.addEventListener('click', () => {
        currentMapData = { start: null, target: [], obstacles: [] };
        drawArena(currentMapData);
        addLog("Peta dikosongkan.");
    });

    // Inisialisasi saat load
    const saved = localStorage.getItem('savedRoboMap');
    if (saved) loadMap(JSON.parse(saved));
    else drawArena(currentMapData);
});
