// === GÉNÉRATION DU DONJON PROCÉDURAL AMÉLIORÉE ===

class Dungeon {
    constructor(width, height, floorLevel = 1) {
        this.width = width;
        this.height = height;
        this.map = [];
        this.rooms = [];
        this.playerStart = null;
        this.stairs = null;
        this.enemies = [];
        this.items = [];
        this.floorLevel = floorLevel;
        this.generate();
        this.populateDungeon();
    }

    generate() {
        // Initialisation vide (murs partout)
        this.map = Array(this.height).fill().map(() => Array(this.width).fill('#'));

        // Génération de salles
        let numRooms = 6 + Math.floor(Math.random() * 5);
        this.rooms = [];
        let maxAttempts = 50;

        for (let attempt = 0; attempt < maxAttempts && this.rooms.length < numRooms; attempt++) {
            let w = 4 + Math.floor(Math.random() * 6);
            let h = 4 + Math.floor(Math.random() * 5);
            let x = 1 + Math.floor(Math.random() * (this.width - w - 2));
            let y = 1 + Math.floor(Math.random() * (this.height - h - 2));

            let newRoom = { x, y, w, h };
            let overlaps = false;
            for (let room of this.rooms) {
                if (newRoom.x < room.x + room.w + 3 &&
                    newRoom.x + newRoom.w + 3 > room.x &&
                    newRoom.y < room.y + room.h + 3 &&
                    newRoom.y + newRoom.h + 3 > room.y) {
                    overlaps = true;
                    break;
                }
            }
            if (!overlaps) {
                this.rooms.push(newRoom);
                // Creuser la salle
                for (let i = y; i < y + h; i++) {
                    for (let j = x; j < x + w; j++) {
                        if (i >= 0 && i < this.height && j >= 0 && j < this.width) {
                            this.map[i][j] = '.';
                        }
                    }
                }
            }
        }

        // S'assurer qu'on a au moins 2 salles
        if (this.rooms.length < 2) {
            this.rooms = [];
            let room1 = { x: 5, y: 5, w: 6, h: 5 };
            let room2 = { x: 15, y: 10, w: 6, h: 5 };
            this.rooms.push(room1, room2);
            for (let i = room1.y; i < room1.y + room1.h; i++)
                for (let j = room1.x; j < room1.x + room1.w; j++) this.map[i][j] = '.';
            for (let i = room2.y; i < room2.y + room2.h; i++)
                for (let j = room2.x; j < room2.x + room2.w; j++) this.map[i][j] = '.';
        }

        // Connecter les salles avec des couloirs
        for (let i = 0; i < this.rooms.length - 1; i++) {
            let roomA = this.rooms[i];
            let roomB = this.rooms[i + 1];
            let centerA = { x: Math.floor(roomA.x + roomA.w / 2), y: Math.floor(roomA.y + roomA.h / 2) };
            let centerB = { x: Math.floor(roomB.x + roomB.w / 2), y: Math.floor(roomB.y + roomB.h / 2) };
            this.createTunnel(centerA.x, centerA.y, centerB.x, centerB.y);
        }

        // Placement du joueur (première salle)
        let startRoom = this.rooms[0];
        this.playerStart = {
            x: Math.floor(startRoom.x + startRoom.w / 2),
            y: Math.floor(startRoom.y + startRoom.h / 2)
        };

        // Placement des escaliers (dernière salle)
        let stairRoom = this.rooms[this.rooms.length - 1];
        this.stairs = {
            x: Math.floor(stairRoom.x + stairRoom.w / 2),
            y: Math.floor(stairRoom.y + stairRoom.h / 2)
        };
        if (this.map[this.stairs.y] && this.map[this.stairs.y][this.stairs.x]) {
            this.map[this.stairs.y][this.stairs.x] = '>';
        }
    }

    createTunnel(x1, y1, x2, y2) {
        let stepX = (x1 < x2) ? 1 : -1;
        let stepY = (y1 < y2) ? 1 : -1;

        let currentX = x1, currentY = y1;
        while (currentX !== x2) {
            if (currentY >= 0 && currentY < this.height && currentX >= 0 && currentX < this.width) {
                this.map[currentY][currentX] = '.';
            }
            currentX += stepX;
        }
        while (currentY !== y2) {
            if (currentY >= 0 && currentY < this.height && currentX >= 0 && currentX < this.width) {
                this.map[currentY][currentX] = '.';
            }
            currentY += stepY;
        }
    }

    populateDungeon() {
        this.enemies = [];
        this.items = [];

        // Peupler CHAQUE salle (sauf départ) avec des ennemis
        for (let idx = 1; idx < this.rooms.length; idx++) {
            let room = this.rooms[idx];
            let centerX = Math.floor(room.x + room.w / 2);
            let centerY = Math.floor(room.y + room.h / 2);

            // Nombre d'ennemis par salle selon le niveau (1 à 3)
            let enemyCount = 1 + Math.floor(Math.random() * 2) + Math.min(2, Math.floor(this.floorLevel / 3));

            for (let e = 0; e < enemyCount; e++) {
                let offsetX = (Math.random() - 0.5) * (room.w - 2);
                let offsetY = (Math.random() - 0.5) * (room.h - 2);
                let enemyX = Math.max(room.x + 1, Math.min(room.x + room.w - 2, centerX + offsetX));
                let enemyY = Math.max(room.y + 1, Math.min(room.y + room.h - 2, centerY + offsetY));

                let enemyTypes = ['goblin', 'skeleton', 'mage', 'ogre'];
                let weights = [0.4, 0.3, 0.2, 0.1];
                let type = weightedRandom(enemyTypes, weights);
                let enemy = new Enemy(Math.floor(enemyX), Math.floor(enemyY), type, this.floorLevel);
                this.enemies.push(enemy);
            }

            // Loot dans 50% des salles
            if (Math.random() < 0.5 && idx !== this.rooms.length - 1) {
                let lootX = Math.floor(room.x + 1 + Math.random() * (room.w - 2));
                let lootY = Math.floor(room.y + 1 + Math.random() * (room.h - 2));
                let item = generateRandomLoot();
                this.items.push({ x: lootX, y: lootY, item: item });
            }
        }

        // Coffre spécial dans une salle intermédiaire (risk/reward)
        if (this.rooms.length > 2) {
            let specialIdx = Math.floor(this.rooms.length / 2);
            let specialRoom = this.rooms[specialIdx];
            let chestX = Math.floor(specialRoom.x + specialRoom.w / 2);
            let chestY = Math.floor(specialRoom.y + specialRoom.h / 2);
            let isCursed = Math.random() < 0.35;
            let rareItem = generateRareLoot(isCursed);
            this.items.push({ x: chestX, y: chestY, item: rareItem, isChest: true, cursed: isCursed });
            addMessage(`✨ Un COFFRE scintille au centre du niveau ! (cliquez pour l'ouvrir)`);
        }

        // Log de debug
        console.log(`Généré: ${this.enemies.length} ennemis, ${this.items.length} objets`);
    }
}

function weightedRandom(items, weights) {
    let total = weights.reduce((a,b) => a + b, 0);
    let rand = Math.random() * total;
    let accum = 0;
    for (let i = 0; i < items.length; i++) {
        accum += weights[i];
        if (rand < accum) return items[i];
    }
    return items[0];
}
