require(["levels.min", "cookies.min"], function (Levels, Cookies) {

    //#region app.js Scoped Global Variables
    var aMaze = this,
        CIRCLE = Math.PI * 2,
        MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent),
        currentPostition = document.getElementById("position"),
        currentLevel = document.getElementById("currentLevel"),
        instructions = document.getElementById("instructions");
    //#endregion

    //#region Controls
    function Controls() {
        this.codes = { 37: "left", 39: "right", 38: "forward", 40: "backward" };
        this.states = { "left": false, "right": false, "forward": false, "backward": false };
        document.addEventListener("keydown", this.onKey.bind(this, true), false);
        document.addEventListener("keyup", this.onKey.bind(this, false), false);
        document.addEventListener("touchstart", this.onTouch.bind(this), false);
        document.addEventListener("touchmove", this.onTouch.bind(this), false);
        document.addEventListener("touchend", this.onTouchEnd.bind(this), false);

    }

    Controls.prototype.onTouch = function (e) {
        var t = e.touches[0];
        this.onTouchEnd(e);
        if (t.pageY < window.innerHeight * 0.5) this.onKey(true, { keyCode: 38 });
        else if (t.pageX < window.innerWidth * 0.5) this.onKey(true, { keyCode: 37 });
        else if (t.pageY > window.innerWidth * 0.5) this.onKey(true, { keyCode: 39 });
    };

    Controls.prototype.onTouchEnd = function (e) {
        this.states = { "left": false, "right": false, "forward": false, "backward": false };
        e.preventDefault();
        e.stopPropagation();
    };

    Controls.prototype.onKey = function (val, e) {
        var state = this.codes[e.keyCode];
        if (typeof state === "undefined") return;
        this.states[state] = val;
        e.preventDefault && e.preventDefault();
        e.stopPropagation && e.stopPropagation();
    };
    //#endregion

    //#region Bitmap
    function Bitmap(src, width, height) {
        this.image = new Image();
        this.image.src = src;
        this.width = width;
        this.height = height;
    }
    //#endregion

    //#region Player
    function Player(x, y, direction) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.paces = 0;
    }

    Player.prototype.rotate = function (angle) {
        this.direction = (this.direction + angle + CIRCLE) % (CIRCLE);
    };

    Player.prototype.walk = function (distance, map) {
        var dx = Math.cos(this.direction) * distance;
        var dy = Math.sin(this.direction) * distance;
        if (map.get(this.x + dx, this.y) <= 0) this.x += dx;
        if (map.get(this.x, this.y + dy) <= 0) this.y += dy;

        if (this.y > map.size || this.y < 0 || this.x > map.size || this.x < 0) {
            if (!aMaze.mazeCompleted) {
                aMaze.mazeCompleted = true;
            }
            else {
                aMaze.loop.stop();
                var nextLevel = aMaze.currentLevel + 1;
                if (Levels.length == nextLevel) {
                    alert("Congratulations! You have escaped from all mazes. You are aMazing ;)");
                }
                else {
                    if (confirm("You have escaped! Click OK to move on to the next level or CANCEL to play this level over again.")) {
                        aMaze.currentLevel++
                    }
                    aMaze.onRestartLevel();
                }
            }
        }
        else {
            this.paces += distance;
        }
    };

    Player.prototype.update = function (controls, map, seconds) {
        aMaze.updatesMade++;
        if (controls.left) this.rotate(-Math.PI * seconds);
        if (controls.right) this.rotate(Math.PI * seconds);
        if (controls.forward) this.walk(3 * seconds, map);
        if (controls.backward) this.walk(-3 * seconds, map);

        currentPostition.innerHTML = "X: " + Math.round(this.x) + " | Y: " + Math.round(this.y) + " | Direction: " + this.getCardinalDirection(this.direction);

        if (aMaze.updatesMade % 25 == 0) { // Set cookie for location once every 25 updates to prevent lag            
            aMaze.setLocation(this.x, this.y, this.direction);
        }
    };

    Player.prototype.getCardinalDirection = function (dir) {

        var dirString = "E",
            directionThreshold = 0.39269908125,
            seValue = 0.7853981625,
            sValue = 1.570796325,
            swValue = 2.3561944875,
            wValue = 3.14159265,
            nwValue = 3.9269908125,
            nValue = 4.712388975,
            neValue = 5.4977871375,
            eValue = 6.2831853;

        if ((dir >= (seValue - directionThreshold)) && (dir <= (seValue + directionThreshold))) {
            dirString = "SE";
        }
        else if ((dir >= (sValue - directionThreshold)) && (dir <= (sValue + directionThreshold))) {
            dirString = "S";
        }
        else if ((dir >= (swValue - directionThreshold)) && (dir <= (swValue + directionThreshold))) {
            dirString = "SW";
        }
        else if ((dir >= (wValue - directionThreshold)) && (dir <= (wValue + directionThreshold))) {
            dirString = "W";
        }
        else if ((dir >= (nwValue - directionThreshold)) && (dir <= (nwValue + directionThreshold))) {
            dirString = "NW";
        }
        else if ((dir >= (nValue - directionThreshold)) && (dir <= (nValue + directionThreshold))) {
            dirString = "N";
        }
        else if ((dir >= (neValue - directionThreshold)) && (dir <= (neValue + directionThreshold))) {
            dirString = "NE";
        }

        return dirString;

    };
    //#endregion

    //#region Map
    function Map(level) {
        this.size = level.size;
        this.walllevel = level.walls;
        this.skybox = (level.skybox ? new Bitmap(level.skybox.path, level.skybox.width, level.skybox.height) : 
                                      new Bitmap("assets/bg.png", 2000, 750));
        this.wallTexture = (level.wallTexture ? new Bitmap(level.wallTexture.path, level.wallTexture.width, level.wallTexture.height) :
                                               new Bitmap("assets/wall_texture.jpg", 700, 516));
        this.light = (level.light ? level.light : 0.6);
    }

    Map.prototype.get = function (x, y) {
        x = Math.floor(x);
        y = Math.floor(y);
        if (x < 0 || x > this.size - 1 || y < 0 || y > this.size - 1) return -1;
        return this.walllevel[y * this.size + x];
    };

    Map.prototype.cast = function (point, angle, range) {
        var self = this;
        var sin = Math.sin(angle);
        var cos = Math.cos(angle);
        var noWall = { length2: Infinity };

        return ray({ x: point.x, y: point.y, height: 0, distance: 0 });

        function ray(origin) {
            var stepX = step(sin, cos, origin.x, origin.y);
            var stepY = step(cos, sin, origin.y, origin.x, true);
            var nextStep = stepX.length2 < stepY.length2
              ? inspect(stepX, 1, 0, origin.distance, stepX.y)
              : inspect(stepY, 0, 1, origin.distance, stepY.x);

            if (nextStep.distance > range) return [origin];
            return [origin].concat(ray(nextStep));
        }

        function step(rise, run, x, y, inverted) {
            if (run === 0) return noWall;
            var dx = run > 0 ? Math.floor(x + 1) - x : Math.ceil(x - 1) - x;
            var dy = dx * (rise / run);
            return {
                x: inverted ? y + dy : x + dx,
                y: inverted ? x + dx : y + dy,
                length2: dx * dx + dy * dy
            };
        }

        function inspect(step, shiftX, shiftY, distance, offset) {
            var dx = cos < 0 ? shiftX : 0;
            var dy = sin < 0 ? shiftY : 0;
            step.height = self.get(step.x - dx, step.y - dy);
            step.distance = distance + Math.sqrt(step.length2);
            if (shiftX) step.shading = cos < 0 ? 2 : 0;
            else step.shading = sin < 0 ? 2 : 1;
            step.offset = offset - Math.floor(offset);
            return step;
        }
    };

    Map.prototype.update = function (seconds) {
        if (this.light > 0) this.light = Math.max(this.light - 10 * seconds, 0);
        else if (Math.random() * 5 < seconds) this.light = 2;
    };
    //#endregion

    //#region Camera
    function Camera(canvas, resolution, focalLength) {
        this.ctx = canvas.getContext("2d");
        this.width = canvas.width = window.innerWidth * 0.5;
        this.height = canvas.height = window.innerHeight * 0.5;
        this.resolution = resolution;
        this.spacing = this.width / resolution;
        this.focalLength = focalLength || 0.8;
        this.range = MOBILE ? 8 : 28;
        this.lightRange = 5;
        this.scale = (this.width + this.height) / 1200;
    }

    Camera.prototype.render = function (player, map) {
        this.drawSky(player.direction, map.skybox, map.light);
        this.drawColumns(player, map);
    };

    Camera.prototype.drawSky = function (direction, sky, ambient) {
        var width = sky.width * (this.height / sky.height) * 2;
        var left = (direction / CIRCLE) * -width;

        this.ctx.save();
        this.ctx.drawImage(sky.image, left, 0, width, this.height);
        if (left < width - this.width) {
            this.ctx.drawImage(sky.image, left + width, 0, width, this.height);
        }

        this.ctx.restore();
    };

    Camera.prototype.drawColumns = function (player, map) {
        this.ctx.save();
        for (var column = 0; column < this.resolution; column++) {
            var x = column / this.resolution - 0.5;
            var angle = Math.atan2(x, this.focalLength);
            var ray = map.cast(player, player.direction + angle, this.range);
            this.drawColumn(column, ray, angle, map);
        }
        this.ctx.restore();
    };

    Camera.prototype.drawColumn = function (column, ray, angle, map) {
        var ctx = this.ctx;
        var texture = map.wallTexture;
        var left = Math.floor(column * this.spacing);
        var width = Math.ceil(this.spacing);
        var hit = -1;

        while (++hit < ray.length && ray[hit].height <= 0);

        for (var s = ray.length - 1; s >= 0; s--) {
            var step = ray[s];

            if (s === hit) {
                var textureX = Math.floor(texture.width * step.offset);
                var wall = this.project(step.height, angle, step.distance);
                ctx.globalAlpha = 1;
                ctx.drawImage(texture.image, textureX, 0, 1, texture.height, left, wall.top, width, wall.height);

                ctx.fillStyle = "#000";
                ctx.globalAlpha = Math.max((step.distance + step.shading) / this.lightRange - map.light, 0);
                ctx.fillRect(left, wall.top, width, wall.height);
            }

            ctx.fillStyle = "#fff";
            ctx.globalAlpha = 0.15;
        }
    };

    Camera.prototype.project = function (height, angle, distance) {
        var z = distance * Math.cos(angle);
        var wallHeight = this.height * height / z;
        var bottom = this.height / 2 * (1 + 1 / z);
        return {
            top: bottom - wallHeight,
            height: wallHeight
        };
    };
    //#endregion

    //#region GameLoop
    function GameLoop() {
        this.frame = this.frame.bind(this);
        this.lastTime = 0;
        this.callback = function () { };
    }

    GameLoop.prototype.start = function (callback) {
        this.callback = callback;
        requestAnimationFrame(this.frame);
    };

    GameLoop.prototype.stop = function () {
        this.callback = null;
        requestAnimationFrame(this.frame);
    };

    GameLoop.prototype.frame = function (time) {
        var seconds = (time - this.lastTime) / 1000;
        this.lastTime = time;
        if (this.callback !== null) {
            if (seconds < 0.2) this.callback(seconds);
            requestAnimationFrame(this.frame);
        }
    };
    //#endregion

    //#region aMaze
    aMaze.init = function (level) {
        Cookies.setItem("level", aMaze.currentLevel, Infinity);
        currentLevel.innerHTML = "Level: " + level.id;
        aMaze.mazeCompleted = false;
        aMaze.display = document.getElementById("display");
        aMaze.player = new Player((Cookies.hasItem("x") ? Number(Cookies.getItem("x")) : level.startingPoint.x),
                                (Cookies.hasItem("y") ? Number(Cookies.getItem("y")) : level.startingPoint.y),
                                (Cookies.hasItem("dir") ? Number(Cookies.getItem("dir")) : level.startingDirection));

        aMaze.map = new Map(level);
        aMaze.controls = new Controls();
        aMaze.camera = new Camera(aMaze.display, MOBILE ? 180 : 640, .5);
        aMaze.loop = new GameLoop();

        aMaze.loop.start(function frame(seconds) {
            aMaze.player.update(aMaze.controls.states, aMaze.map, seconds);
            aMaze.camera.render(aMaze.player, aMaze.map);
        });

        instructions.style.display = "block";
        setTimeout(function () {
            instructions.style.display = "none";
        }, 10000);
    };

    aMaze.onRestartLevel = function () {
        aMaze.loop.stop();
        aMaze.clearLocation();
        aMaze.init(Levels[aMaze.currentLevel]);
    };

    aMaze.onRestartGame = function () {
        Cookies.removeItem("level");
        aMaze.currentLevel = 0;
        aMaze.onRestartLevel();
    };

    aMaze.clearLocation = function () {
        Cookies.removeItem("x");
        Cookies.removeItem("y");
        Cookies.removeItem("dir");
    }

    aMaze.setLocation = function (x, y, dir) {
        Cookies.setItem("x", x, Infinity);
        Cookies.setItem("y", y, Infinity);
        Cookies.setItem("dir", dir, Infinity);
    }

    document.getElementById("restartLevel").addEventListener("click", aMaze.onRestartLevel.bind(this), false);
    document.getElementById("restartGame").addEventListener("click", aMaze.onRestartGame.bind(this), false);

    aMaze.updatesMade = 0;
    aMaze.currentLevel = Cookies.hasItem("level") ? Number(Cookies.getItem("level")) : 0;
    aMaze.init(Levels[aMaze.currentLevel]);
    //#endregion

});
