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
    const labels = document.getElementsByTagName("label");
    const cv = document.getElementsByTagName("canvas")[0];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const {
        emMass, emBalanceForce, emKp, emKi, emKd, emForce,
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

    const SCALE = 0.05;
    var g = -9.8;
    var PID = {
        kp: 0, ki: 0, kd: 0,
        ey: 0, ey_1: 0, eySum: 0, dt: 0, vy: 0, vy_1: 0, maxay: 0,
        kpStep0: 0, kpStep1: Math.pow(2, 16), kpStep2: Math.pow(2, 32), kpState: "testingpid", kpSign: 1,
    }

    var ball = {
        x: toCenterX(0), y: 20, vx: 0, vy: 0, dvx: 0, dvy: 0, radius: 10,
        minForce: 0, maxForce: 30, force: 0, mass: 1, pid: PID,
        balanceForce: 0, balanceForceMatch: undefined,
    }
    emMass.oninput = e => {
        ball.mass = parseFloat(emMass.value);
        if (isNaN(ball.mass) || ball.mass < 0.1) ball.mass = 0.1;
        emMass.value = ball.mass;
    }
    emMass.oninput();

    var target = { x: toCenterX(0), y: toCenterY(20) };

    var t0 = new Date().getTime() - 0.015;

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
        const a = g + ball.force / ball.mass;
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
        ball.pid.dt = dt;


        ball.pid.ey_1 = ball.pid.ey;
        ball.pid.ey = (target.y - ball.y) * SCALE;

        ball.pid.vy_1 = ball.pid.vy;
        ball.pid.vy = (ball.pid.ey - ball.pid.ey_1) / ball.pid.dt;

        if (startEmptyLoopCount > 0) {
            startEmptyLoopCount--;
        } else {
            if (ball.pid.kpState !== "ok") {
                if (ball.pid.kpState === "calcBalanceForce") {
                    // if (almostEqual(ball.dvy, 0)) {
                    //     labels[0].textContent = `balanceForce: ${ball.balanceForce}`;
                    //     console.log("balanceForceMatch: ", ball.balanceForce);
                    //     ball.balanceForceMatch = undefined;
                    //     ball.force = ball.balanceForce;
                    //     ball.pid.kpState = "testingpid";
                    // } else {
                    //     if (!ball.balanceForceMatch) {
                    //         ball.balanceForceMatch = createBinMatch(ball.minForce, ball.maxForce);
                    //     } else {
                    //         binMatch(ball.balanceForceMatch, ball.dvy > 0);
                    //     }
                    //     ball.balanceForce = ball.balanceForceMatch.mid;
                    // }
                } else if (ball.pid.kpState === "testingpid") {
                    ball.pid.kp = ball.maxForce;

                    if (ball.force === ball.maxForce) {
                        const a = (ball.pid.vy - ball.pid.vy_1) / dt;
                        ball.balanceForce = ball.maxForce / (a + g) * g;
                        ball.pid.ki = ball.balanceForce * 0.01;
                    }

                    ball.pid.kd = ball.maxForce;
                }
            }
        }

        let kp = ball.pid.kp * ball.pid.ey;

        ball.pid.eySum += ball.pid.ey;
        if (ball.pid.eySum < -50) ball.pid.eySum = -50;
        else if (ball.pid.eySum > 100) ball.pid.eySum = 100;
        let ki = ball.pid.ki * ball.pid.eySum;

        let kd = ball.pid.kd * ball.pid.vy;

        const force = kp + ki + kd;
        ball.force = clamp(force, ball.minForce, ball.maxForce);


        emBalanceForce.textContent = ball.balanceForce.toFixed(6);
        emKp.textContent = kp.toFixed(6);
        emKi.textContent = ki.toFixed(6);
        emKd.textContent = kd.toFixed(6);
        emForce.textContent = ball.force.toFixed(6);
        console.log(kp.toFixed(6), ki.toFixed(6), kd.toFixed(6), ball.force.toFixed(6));
        draw();

        tick++;
        requestAnimationFrame(update);
    }
    const arrowScale = 3;
    function draw() {
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
        if (ball.force > 0) {
            drawArrow(ball.x, ball.y, 0, 1, ball.force * arrowScale, "blue");
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

    function almostEqual(a, b) {
        return a === b || (a + 0.00000000000000001 >= b && a - 0.00000000000000001 <= b);
    }

    /**
     * 二分法
     * @param {{min:number, mid:number, max:number}} val 
     * @param {*} isTooBig 
     */
    function binMatch(val, isTooBig) {
        if (isTooBig) {
            val.max = val.mid;
        } else {
            val.min = val.mid;
        }
        val.mid = (val.min + val.max) * 0.5;
    }
    /**
     * @param {number} min 
     * @param {number} max 
     * @returns 
     */
    function createBinMatch(min, max) {
        return { min: min, mid: (max + min) * 0.5, max: max };
    }

    update();
}