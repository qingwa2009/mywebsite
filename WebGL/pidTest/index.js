"use strict";

import { getElementsById } from "../../js/myUtil.js";

window.addEventListener('DOMContentLoaded', function () {
    // const App = top.window.App;
    // /**@type{MyMemu} */
    // const myMenu = App.myMenu;
    // const origin = top.location.origin;				// http://127.0.0.1
    // const host = top.location.host;					// 127.0.0.1
    // const hostp = top.location.origin.substr(4);	// ://127.0.0.1或者s://127.0.0.1

    cv0();
});

function cv0() {
    const cv = document.getElementsByTagName("canvas")[0];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const {
        emMass, emBalanceForce, emKp, emKi, emKd, emForce, emState,
    } = getElementsById(document);

    const ctx = cv.getContext("2d");
    window.onresize = e => {
        cv.width = cv.clientWidth;
        cv.height = cv.clientHeight;
        ctx.scale(1, -1);
        ctx.translate(0, -cv.height);
    }
    window.onresize();

    let mbDraging = false;
    let rbDraging = false;
    cv.onmousedown = e => {
        if (e.button === 1) mbDraging = true;
        if (e.button === 2) {
            target.y = cv.height - e.clientY;
            resetCurve();
        }
    }
    cv.onmouseup = e => {
        if (e.button === 1) mbDraging = false;
        if (e.button === 2) rbDraging = false;
    }
    cv.onmousemove = e => {
        if (!e.buttons) return;
        const dx = e.movementX;
        const dy = e.movementY;
        if (mbDraging) {

        } else if (rbDraging) {

        }
    }
    cv.oncontextmenu = e => e.preventDefault();

    const PID_STATE = {
        STOP: 0b111,
        CONSTANT_APPROACH: 0b000,
        CONSTANT_AWAY: 0b001,
        ACCELERATE_APPROACH: 0b010,
        ACCELERATE_AWAY: 0b011,
        DECELERATE_APPROACH: 0b100,
        DECELERATE_AWAY: 0b101
    }


    const SCALE = 0.05;
    var g = -9.8;

    var PID = {
        kp: 0, ki: 0, kd: 0, kpf: 0, kif: 0, kdf: 0,
        ey: 0, ey_1: 0, eySum: 0, eyOffset: 0, vy: 0, vy_1: 0, ay: 0, ay_1: 0,
        minForce: 0, maxForce: 50, force: 0, force_1: 0,
        aboutMass: 1,//等效质量
        balanceForce: 0,//平衡力
        g: g,//重力加速度
        dt: 0, state: PID_STATE.STOP, tolerance: 0.000001,
    }

    var ball = {
        x: toCenterX(0), y: toCenterY(-50), vx: 0, vy: 0, dvx: 0, dvy: 0, radius: 10,
        mass: 1, pid: PID,
    }

    var target = { x: toCenterX(0), y: toCenterY(180) };

    emMass.oninput = e => {
        ball.mass = parseFloat(emMass.value);
        if (isNaN(ball.mass) || ball.mass < 0.1) ball.mass = 0.1;
        emMass.value = ball.mass;
    }
    emMass.oninput();

    var t0 = new Date().getTime() - 150;

    var startEmptyLoopCount = 4;
    var tick = 0;
    function update() {
        const t1 = new Date().getTime();
        const dt = (t1 - t0) * 0.001;
        t0 = t1;
        const bdx0 = ball.radius;
        const bdx1 = cv.width - ball.radius;
        const bdy0 = ball.radius;
        const bdy1 = cv.height - ball.radius;

        ball.x += ball.vx * dt;
        if (ball.x < bdx0) {
            ball.x = bdx0;
            ball.vx = -ball.vx;
        } else if (ball.x > bdx1) {
            ball.x = bdy1;
            ball.vx = -ball.vx;
        }

        const vy0 = ball.vy;
        const a = g + ball.pid.force / ball.mass;
        const vy1 = vy0 + a * dt;
        const dy = 0.5 * (vy0 + vy1) * dt / SCALE;

        ball.y += dy;
        ball.vy = vy1;


        if (ball.y < bdy0) {
            ball.y = bdy0;
            // ball.vy = -ball.vy;
            ball.vy = 0;
        } else if (ball.y > bdy1) {
            ball.y = bdy1;
            const ss = dy - (ball.y - bdy1);
            // ball.vy = vy0 + (ss - vy0 * dt) * 2 / dt;
            ball.vy = 0;
        }
        ball.dvy = (ball.vy - vy0) / dt;

        const ey = (target.y - ball.y) * SCALE;
        PIDControl(ball.pid, ey, dt);


        draw();

        tick++;
        requestAnimationFrame(update);
    }


    function PIDControl(pid, ey, dt) {
        pid.dt = dt;

        pid.ey_1 = pid.ey;
        pid.ey = ey;

        pid.vy_1 = pid.vy;
        pid.vy = (pid.ey - pid.ey_1) / pid.dt;

        pid.ay_1 = pid.ay;
        pid.ay = (pid.vy - pid.vy_1) / pid.dt;

        if (almostEqual(pid.vy, 0, pid.tolerance) && almostEqual(pid.vy_1, 0, pid.tolerance) &&
            almostEqual(pid.ay, 0, pid.tolerance) && almostEqual(pid.ay_1, 0, pid.tolerance)
        ) {
            pid.state = PID_STATE.STOP;
        } else {
            if (Math.abs(pid.ey) > Math.abs(pid.ey_1)) {
                pid.state = PID_STATE.CONSTANT_AWAY;
            } else {
                pid.state = PID_STATE.CONSTANT_APPROACH;
            }

            const vy = Math.abs(pid.vy);
            const vy_1 = Math.abs(pid.vy_1);
            if (!almostEqual(vy, vy_1, pid.tolerance)) {
                if (vy > vy_1) {
                    pid.state += PID_STATE.ACCELERATE_APPROACH;
                } else {
                    pid.state += PID_STATE.DECELERATE_APPROACH;
                }
            }
        }

        if (almostEqual(pid.force, pid.force_1, pid.tolerance) && pid.force > 0.1 * pid.maxForce) {
            //等效质量         
            pid.aboutMass = -pid.force / (pid.ay + pid.g);
            pid.balanceForce = -pid.aboutMass * pid.g;
            if (pid.balanceForce >= pid.maxForce || pid.balanceForce <= pid.minForce) {
                console.error("too heavy!");
            }
            //等效偏移
            pid.eyOffset = pid.balanceForce / pid.kp;
        }


        pid.kp = pid.maxForce;
        pid.kpf = pid.kp * (pid.ey + pid.eyOffset);
        // pid.kpf = pid.kp * pid.ey;

        pid.ki = pid.maxForce * 0.001;
        if (!almostEqual(pid.ey, 0, pid.tolerance)) {
            if (0 < pid.ey && pid.ey < 1) {
                pid.eySum += 1;
            } else if (-1 < pid.ey && pid.ey < 0) {
                pid.eySum -= 1;
            } else {
                pid.eySum += 1 / pid.ey;
            }
        }
        pid.ki = 0;
        pid.kif = pid.ki * pid.eySum;



        // if (pid.ey > 0.001) {
        //     let stopForce = - pid.aboutMass * ((pid.vy ** 2) / (pid.ey * 2) + g);
        //     console.log(stopForce.toFixed(2));
        //     if (stopForce < pid.minForce) {
        //         pid.kd = (pid.minForce - pid.kpf) / pid.vy;
        //     } else if (stopForce > pid.maxForce) {
        //         pid.kd = (pid.maxForce - pid.kpf) / pid.vy;
        //     } else {
        pid.kd = pid.maxForce;
        //     }
        pid.kdf = pid.kd * pid.vy;
        // } else {
        //     console.log("aa");
        // }


        const force = pid.kpf + pid.kif + pid.kdf;
        pid.force_1 = pid.force;
        pid.force = clamp(force, pid.minForce, pid.maxForce);

        return pid.force;
    }

    const arrowScale = 3;
    function draw() {
        emBalanceForce.textContent = ball.pid.balanceForce.toFixed(6);
        emKp.textContent = ball.pid.kpf.toFixed(6);
        emKi.textContent = ball.pid.kif.toFixed(6);
        emKd.textContent = ball.pid.kdf.toFixed(6);
        emForce.textContent = ball.pid.force.toFixed(6);
        if (ball.pid.state === PID_STATE.STOP) {
            emState.textContent = "停";
        } else {
            emState.textContent = ball.pid.state & 0b001 ? "远离" : "靠近";
            const sv = (ball.pid.state >> 1);
            emState.textContent += sv === 0 ? " 匀速" : sv === 1 ? " 加速" : " 减速";
        }

        ctx.clearRect(0, 0, cv.width, cv.height);

        ctx.beginPath();
        ctx.ellipse(ball.x, ball.y, ball.radius, ball.radius, 0, 0, 360);
        ctx.closePath();
        ctx.fillStyle = "gray";
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(target.x, target.y, ball.radius + 1, ball.radius + 1, 0, 0, 360);
        ctx.closePath();
        ctx.strokeStyle = "red";
        ctx.stroke()


        drawArrow(ball.x, ball.y, 0, -1, -ball.mass * g * arrowScale, "green");
        if (ball.pid.force > 0) {
            drawArrow(ball.x, ball.y, 0, 1, ball.pid.force * arrowScale, "blue");
        }

        ctx.save()
        ctx.translate(0, cv.height);
        ctx.scale(1, -1);
        ctx.strokeStyle = "purple";
        ctx.strokeText(((target.y - ball.y) * SCALE).toFixed(3) + "m", target.x, cv.height - target.y);
        ctx.textAlign = "right";
        ctx.strokeStyle = "black";
        ctx.strokeText(ball.vy.toFixed(3) + "m/s", ball.x, cv.height - ball.y);
        ctx.restore();


        drawCurve();

    }

    function drawArrow(x0, y0, dirx, diry, length, color, arrowW = 6, arrowH = 8) {

        const d = Math.sqrt(dirx * dirx + diry * diry);
        const dx = dirx / d;
        const dy = diry / d;
        const p1 = Math.max(length - arrowH, 0);
        const x1 = x0 + dx * p1;
        const y1 = y0 + dy * p1;
        const dx1 = dy;
        const dy1 = -dx;
        const w = arrowW * 0.5;
        const x2 = x1 + dx1 * w;
        const y2 = y1 + dy1 * w;
        const x3 = x0 + dx * length;
        const y3 = y0 + dy * length;
        const x4 = x1 - dx1 * w;
        const y4 = y1 - dy1 * w;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.lineTo(x1, y1);
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }

    var pKPF;
    var pKIF;
    var pKDF;
    var pF;
    var pEy;
    var pV;
    var pAboutMass;

    var pi;

    function resetCurve() {
        pKPF = new Path2D();
        pKIF = new Path2D();
        pKDF = new Path2D();
        pF = new Path2D();
        pEy = new Path2D();
        pV = new Path2D();
        pAboutMass = new Path2D();

        pKPF.moveTo(0, toCenterY(0));
        pKIF.moveTo(0, toCenterY(0));
        pKDF.moveTo(0, toCenterY(0));
        pF.moveTo(0, toCenterY(0));
        pEy.moveTo(0, toCenterY(0));
        pV.moveTo(0, toCenterY(0));
        pAboutMass.moveTo(0, toCenterY(0));

        pi = 0;
    }
    resetCurve();
    function drawCurve() {

        if (ball.pid.state !== PID_STATE.STOP) {
            pi++;
            pKPF.lineTo(pi, toCenterY(ball.pid.kpf));
            pKIF.lineTo(pi, toCenterY(ball.pid.kif));
            pKDF.lineTo(pi, toCenterY(ball.pid.kdf));
            pF.lineTo(pi, toCenterY(ball.pid.force));
            pEy.lineTo(pi, toCenterY(ball.pid.ey * ball.pid.maxForce));
            pV.lineTo(pi, toCenterY(ball.vy * -ball.pid.kd));
            pAboutMass.lineTo(pi, toCenterY(ball.pid.aboutMass * 10));
        }

        ctx.save();
        ctx.lineWidth = 0.5;

        ctx.moveTo(0, toCenterY(0));
        ctx.lineTo(cv.width, toCenterY(0));
        ctx.strokeStyle = "black";
        ctx.stroke();

        ctx.strokeStyle = "darkcyan";
        ctx.stroke(pKPF);
        ctx.strokeStyle = "deepskyblue";
        ctx.stroke(pKIF);
        ctx.strokeStyle = "chocolate";
        ctx.stroke(pKDF);
        ctx.strokeStyle = "blue";
        ctx.stroke(pF);

        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "purple";
        ctx.stroke(pEy);

        ctx.strokeStyle = "black";
        ctx.stroke(pV);

        ctx.strokeStyle = "gray";
        ctx.stroke(pAboutMass);
        ctx.setLineDash([]);

        ctx.restore();
    }

    function toCenterX(x) {
        return x + 0.5 * cv.width;
    }
    function toCenterY(y) {
        return y + 0.5 * cv.height;
    }
    function clamp(n, min, max) {
        if (n < min) return min;
        if (n > max) return max;
        return n;
    }

    function almostEqual(a, b, tolerance) {
        return a === b || (a + tolerance >= b && a - tolerance <= b);
    }



    update();
}