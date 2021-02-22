/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("flipbook-canvas");

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");

class Vector2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

function V2(x, y) {
  return new Vector2(x, y);
}

const V = V2;

class Vector3 {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

function V3(x, y, z) {
  return new Vector3(x, y, z);
}

function lerp(a, b, m) {
  return a + (b - a) * m;
}

function v2lerp(v1, v2, m) {
  return V2(lerp(v1.x, v2.x, m), lerp(v1.y, v2.y, m));
}

function v3lerp(v1, v2, m) {
  return V3(lerp(v1.x, v2.x, m), lerp(v1.y, v2.y, m), lerp(v1.z, v2.z, m));
}

function v2dist(v1, v2) {
  return Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
}

class Camera {
  constructor(flength = 20) {
    this.flength = flength;
  }

  project(vector) {
    let mul = this.flength / (vector.z + this.flength);
    return V2(mul * vector.x, mul * vector.y);
  }
}

class TransformImage {
  constructor(image) {
    this.image = image;
    this.a = V3(0,0,0);
    this.b = V3(100, 0,0);
    this.c = V3(100, 100,0);
    this.d = V3(0, 100,0);
    this.subx = 3;
    this.suby = 3;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx 
   * @param {Camera} camera
   * */
  draw(ctx, camera) {
    ctx.save();

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    for (let iy = 0; iy < this.suby; iy++) {
      let my = iy / this.suby;
      let my2 = (iy + 1) / this.suby;

      let left = v3lerp(this.a, this.d, my);
      let right = v3lerp(this.b, this.c, my);
      let left2 = v3lerp(this.a, this.d, my2);
      let right2 = v3lerp(this.b, this.c, my2);

      for (let ix = 0; ix < this.subx; ix++) {
        let mx = ix / this.subx;
        let mx2 = (ix + 1) / this.subx;
        let a = camera.project(v3lerp(left, right, mx));
        let b = camera.project(v3lerp(left, right, mx2));
        let d = camera.project(v3lerp(left2, right2, mx));
        let c = camera.project(v3lerp(left2, right2, mx2));

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.lineTo(a.x, a.y);
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        const distab = v2dist(a, b);
        const dx = Math.cos(angle(V2(d.x - a.x, d.y - a.y))) * v2dist(a, d);

        ctx.save()
        ctx.translate(a.x, a.y);
        ctx.rotate(angle(V2(b.x - a.x, b.y - a.y)));
        ctx.fillStyle = "#00FF0055";

        //ctx.transform(1,0,-dx / distab,1,0,0);
        ctx.fillRect(0,0,v2dist(a,b), Math.sin(angle(V2(d.x - a.x, d.y - a.y))) * v2dist(a, d));
        ctx.restore();
      }
    }

    ctx.restore();
  }
}



const verts = [V(0,0), V(150, 100), V(-100, 100)];

function angle(vector) {
  return Math.atan2(vector.y, vector.x);
}

img = new Image();
img.src = "assets/monk.webp"

img.onload = () => {
  console.log(img);
}

const tpic = new TransformImage(img);
let a = 0;
const d = 200;


tpic.a = V3(-200, 200, 0);
tpic.b = V3(200, 200, 100);
tpic.c = V3(250, -200, 100);
tpic.d = V3(-150, -200, 0);

const camera = new Camera(250);

console.log(camera);

console.log(camera.project(V3(10, 10, 5)));

function draw() {

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  ctx.translate(canvas.width / 2, canvas.height / 2);

  ctx.save()
  tpic.draw(ctx, camera);
  ctx.restore()


  ctx.save();
  ctx.fillStyle = "#00000055";
  ctx.fillRect(0,0,100,-100);
  ctx.transform(1,0,-1,1,0,0);
  ctx.fillStyle = "#00FF0055";
  ctx.fillRect(0,0,100,-100);
  ctx.restore();

  ctx.restore();

  requestAnimationFrame(draw);
}

window.onload = function() {
  requestAnimationFrame(draw);
}