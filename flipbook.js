/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("flipbook-canvas");

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");

class Vector2 {
  constructor(x = 0, y = x) {
    this.x = x;
    this.y = y;
  }
  copy() {
    return V2(this.x, this.y);
  }
}

function V2(x, y) {
  return new Vector2(x, y);
}

function lerp(a, b, m, e = 0.01) {
  let r = a + (b - a) * m;
  if (Math.abs(b - r) < e) {
    return b;
  }
  return r;
}

function v2lerp(a, b, m, e) {
  return V2(lerp(a.x, b.x, m, e), lerp(a.y, b.y, m, e));
}

function v2dist(a, b) {
  return Math.sqrt(Math.pow(b.x - a.x, 2), Math.pow(b.y - a.y, 2));
}

function unlerp(a, b, x) {
  return (x - a) / (b - a);
}

function clamp(a, min, max) {
  if (a < min) {
    return min;
  } else if (a > max) {
    return max;
  }
  return a;
}

class Entity {
  constructor() {
    this.position = V2();
    this.size = V2();
    this.depth = 0;
    this.mdepth = 0;
    this.parentslide = null;
    this.animations = [];
  }

  tick() {}
  draw(ctx) {}
  mouse_down(mpos) {}
  mouse_up(mpos) {}
  check_mouse(mpos) {
    if (mpos.x >= this.position.x - this.size.x / 2
      && mpos.x <= this.position.x + this.size.x / 2
      && mpos.y >= this.position.y - this.size.y / 2
      && mpos.y <= this.position.y + this.size.y / 2) {
      return true;
    }
    return false;
  }
  mouse_hover(mpos) {}
  on_deactivate() {}
  on_activate() {}
}

class ImageEnt extends Entity {
  constructor(sprite, parent, config = {}) {
    super();

    this.parentslide = parent;
    this.sprite = sprite;
  

    this.size = config.size && config.size.copy() || V2(100);
    if (config.lockImageRatio) {
      if (config.width != undefined) {
        this.size.x = config.width;
        this.size.y = (this.size.x / sprite.size.x) * sprite.size.y;
      } else if (config.height != undefined) {
        this.size.y = config.height;
        this.size.x = (this.size.y / sprite.size.y) * sprite.size.x;
      } else {
        this.size.y = (this.size.x / sprite.size.x) * sprite.size.y;
      }
    }

    this.position = config.position && config.position.copy() || V2();
    if (config.leftCornerPos) {
      this.position.x += this.size.x / 2;
      this.position.y += this.size.y / 2;
    }

    if (config.leftCanvasPos && this.parentslide != undefined) {
      this.position.x -= parent.canvasSize.x / 2;
      this.position.y -= parent.canvasSize.y / 2;
    }

    this.rotation = config.rotation || 0;
    
    this.activate_animation = config.activateAnimation;
    this.activate_animation && this.activate_animation.init(this);

    this.hover_animation = config.hoverAnimation;
    this.hover_animation && this.hover_animation.init(this);

    this.unhover_animation = config.unhoverAnimation;
    this.unhover_animation && this.unhover_animation.init(this);

    this.hovered_over = false;
    this.hover_to_top = config.hoverToTop || this.hover_animation && true;

    this.top_depth = config.topDepth || 1000;
    this.top_mdepth = config.topMdepth || 1000;

    this.default_position = this.position.copy();
    this.default_size = this.size.copy();

    this.activate_delay = config.activateDelay || 0;
    this.current_delay = this.activate_delay;

    this.shadow_draw = config.shadowDraw || false;
    this.shadow_blur = config.shadowBlur || 10;
    this.shadow_color = config.shadowColor || "#00000055";

    this.outline_width = config.outlineWidth || 0;
    this.outline_color = config.outlineColor;

    this.link = config.link;
    this.callback = config.callback || this.link && (() => window.open(this.link)) || function() {};

    this.depth = config.depth || 0;
    this.mdepth = config.mdepth || this.depth;

    this.default_depth = this.depth;
    this.default_mdepth = this.mdepth;
  }

  on_activate() {

    this.current_delay = this.activate_delay;
    this.activate_animation && this.activate_animation.start();
    this.sprite.upgrade();
  }

  tick() {
    if (this.current_delay > 0) {
      this.current_delay -= 1;
      return;
    }

    this.activate_animation && this.activate_animation.update();
    this.hover_animation && this.hover_animation.update();
    this.unhover_animation && this.unhover_animation.update();
  }

  draw(ctx) {

    if (this.size.x == 0 && this.size.y == 0) {
      return;
    }

    ctx.save();

    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);

    if (this.outline_color) {
      ctx.save();
      if (this.shadow_draw) {
        ctx.shadowBlur = this.shadow_blur;
        ctx.shadowColor = this.shadow_color;
      }
      ctx.fillStyle = this.outline_color;
      ctx.fillRect(-this.size.x / 2 - this.outline_width, -this.size.y / 2 - this.outline_width, this.size.x + 2*this.outline_width, this.size.y + 2*this.outline_width);
      ctx.restore();
    } else {
      if (this.shadow_draw) {
        ctx.shadowBlur = this.shadow_blur;
        ctx.shadowColor = this.shadow_color;
      }
    }

    ctx.drawImage(this.sprite.image, -this.size.x / 2, -this.size.y /2, this.size.x, this.size.y);

    ctx.restore();
  }

  mouse_down(mpos) {
    if (this.check_mouse(mpos)) {
      this.callback();
    }
  }

  mouse_hover(mpos) {
    if (this.check_mouse(mpos)) {
      if (!this.hovered_over) {
        this.unhover_animation && this.unhover_animation.stop();
        this.hover_animation && this.hover_animation.start();
        if (this.hover_to_top) {
          this.depth = this.top_depth;
          this.mdepth = this.top_mdepth;
        }
      }
      this.hovered_over = true;
    } else {
      if (this.hovered_over) {
        this.hover_animation && this.hover_animation.stop();
        this.unhover_animation && this.unhover_animation.start();
        if (this.hover_to_top) {
          this.depth = this.default_depth;
          this.mdepth = this.default_mdepth;
        }
      }
      this.hovered_over = false;
    }
    //return this.hovered_over;
  }
}

class Animation {
  constructor() {
    this.active = false;
  }
  init(entity) {
    this.entity = entity;
  }
  start() {
    this.active = true;
  }
  stop() {
    this.active = false;
  }
  update() {
    if (this.active) {
      this.tick();
    }
  }
  tick() {}
}

class MoveAnimation extends Animation {
  constructor(from, to) {
    super();
    this.from = from;
    this.to = to;
  }

  start() {
    this.active = true;
    this.entity.position = this.from.copy();
  }
}

class MoveLerpAnimation extends MoveAnimation {
  constructor(from, to, magnitude) {
    super(from, to);
    this.magnitude = magnitude;
  }
  tick() {
    this.entity.position.x = lerp(this.entity.position.x, this.to.x, this.magnitude);
    this.entity.position.y = lerp(this.entity.position.y, this.to.y, this.magnitude);
    if (this.entity.position.x == this.to.x && this.entity.position.y == this.to.y) {
      this.active = false;
    }
  }
}

class SlideInAnimation extends Animation {
  constructor(side = "left") {
    super();
    this.side = side;
  }
  start() {
    this.active = true;
    this.target_position = this.entity.default_position.copy();
    if (this.side == "left") {
      this.entity.position = V2(
        -this.entity.parentslide.canvasSize.x / 2 - this.entity.default_size.x,
        this.target_position.y
      );
    } else if (this.side == "right") {
      this.entity.position = V2(
        this.entity.parentslide.canvasSize.x / 2 + this.entity.default_size.x,
        this.target_position.y
      );
    } else if (this.side == "up") {
      this.entity.position = V2(
        this.target_position.x,
        -this.entity.parentslide.canvasSize.y / 2 - this.entity.default_size.y,
      );
    } else if (this.side == "down") {
      this.entity.position = V2(
        this.target_position.x,
        this.entity.parentslide.canvasSize.y / 2 + this.entity.default_size.y,
      );
    }
    
  }
  stop() {
    this.active = false;
  }
}

class SlideOutAnimation extends Animation {
  constructor(side = "left") {
    super();
    this.side = side;
  }
  start() {
    this.active = true;
    if (this.side == "left") {
      this.target_position = V2(
        -this.entity.parentslide.canvasSize.x / 2 - this.entity.default_size.x,
        this.entity.position.y
      );
    } else if (this.side == "right") {
      this.target_position = V2(
        this.entity.parentslide.canvasSize.x / 2 + this.entity.default_size.x,
        this.entity.position.y
      );
    } else if (this.side == "up") {
      this.target_position = V2(
        this.entity.position.x,
        -this.entity.parentslide.canvasSize.y / 2 - this.entity.default_size.y,
      );
    } else if (this.side == "down") {
      this.target_position = V2(
        this.entity.position.x,
        this.entity.parentslide.canvasSize.y / 2 + this.entity.default_size.y,
      );
    }
    
  }
  stop() {
    this.active = false;
  }
}

class SlideOutLerpAnimation extends SlideOutAnimation {
  constructor(side, magnitude = 0.5) {
    super(side);
    this.magnitude = magnitude;
  }

  tick() {
    this.entity.position.x = lerp(this.entity.position.x, this.target_position.x, this.magnitude);
    this.entity.position.y = lerp(this.entity.position.y, this.target_position.y, this.magnitude);
    if (this.entity.position.x == this.target_position.x && this.entity.position.y == this.target_position.y) {
      this.active = false;
    }
  }
}

class SlideInLerpAnimation extends SlideInAnimation {
  constructor(side, magnitude = 0.5) {
    super(side);
    this.magnitude = magnitude;
  }

  tick() {
    this.entity.position.x = lerp(this.entity.position.x, this.target_position.x, this.magnitude);
    this.entity.position.y = lerp(this.entity.position.y, this.target_position.y, this.magnitude);
    if (this.entity.position.x == this.target_position.x && this.entity.position.y == this.target_position.y) {
      this.active = false;
    }
  }
}

class EnlargeAnimation extends Animation {
  constructor(from, to = 1.2) {
    super();
    this.from = from;
    this.to = to;
  }
  start() {
    this.active = true;
    if (this.from != undefined) {
      this.entity.size.x = this.entity.default_size.x * this.from;
      this.entity.size.y = this.entity.default_size.y * this.from;
    }
    this.target_size = V2(this.entity.default_size.x * this.to, this.entity.default_size.y * this.to);
  }
}

class EnlargeLerpAnimation extends EnlargeAnimation {
  constructor(from, to, magnitude) {
    super(from, to);
    this.magnitude = magnitude;
  }

  tick() {
    this.entity.size.x = lerp(this.entity.size.x, this.target_size.x, this.magnitude);
    this.entity.size.y = lerp(this.entity.size.y, this.target_size.y, this.magnitude);
    if (this.entity.size.x == this.target_size.x && this.entity.size.y == this.target_size.y) {
      this.active = false;
    }
  }
}

class CompoundAnimation extends Animation {
  constructor(animations) {
    super();
    this.animations = animations;
  }
  init(entity) {
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].init(entity);
    }
  }
  start() {
    this.active = true;
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].start();
    }
  }
  tick() {
    let finished = true;
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].update();
      if (this.animations[i].active) {
        finished = false;
      }
    }
    this.active = !finished;
  }
}

class SolidBackground extends Entity {
  constructor(color = "#FFAA55", depth = -100) {
    super();
    this.color = color;
    this.depth = depth;
  }
  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    
    ctx.fillRect(-this.parentslide.canvasSize.x / 2, -this.parentslide.canvasSize.y / 2, this.parentslide.canvasSize.x , this.parentslide.canvasSize.y);

    ctx.restore();
  }
}

class Slide {
  constructor(config) {

    this.position = config.position && config.position.copy() || V2();
    this.size = config.size && config.size.copy() || V2(canvas.width, canvas.height);
    this.canvasSize = config.canvasSize && config.canvasSize.copy() || this.size.copy();
 
    this.activate_delay = config.activateDelay || 0;
    this.current_delay = 0;

    this.depth = config.depth || 0;
    


    this.next_activate_animation = config.nextActivateAnimation;
    this.next_activate_animation && this.next_activate_animation.init(this);

    this.next_deactivate_animation = config.nextDeactivateAnimation;
    this.next_deactivate_animation && this.next_deactivate_animation.init(this);

    this.prev_activate_animation = config.prevActivateAnimation;
    this.prev_activate_animation && this.prev_activate_animation.init(this);

    this.prev_deactivate_animation = config.prevDeactivateAnimation;
    this.prev_deactivate_animation && this.prev_deactivate_animation.init(this);

    this.activate_animation = this.next_activate_animation;
    this.deactivate_animation = this.next_deactivate_animation;

    this.entities = [];
    this.backgrounds = [];

    this.default_position = this.position.copy();
    this.default_size = this.size.copy();

    this.position = V2(10000);

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvasSize.x;
    this.canvas.height = this.canvasSize.y;
    this.ctx = this.canvas.getContext("2d");
    this.parentslide = env.masterSlide;
    this.entities_activated = false;
  }

  on_activate(dir) {
    this.current_delay = this.activate_delay;
    this.entities_activated = false;
    if (dir == "next") {
      this.activate_animation = this.next_activate_animation;
      this.deactivate_animation = this.next_deactivate_animation;
    } else if (dir == "prev") {
      this.activate_animation = this.prev_activate_animation;
      this.deactivate_animation = this.prev_deactivate_animation;
    }

    this.activate_animation && this.activate_animation.start();
    this.deactivate_animation && this.deactivate_animation.stop();

    if (!this.activate_animation) {
      this.position = V2(10000);
    }
  }

  activate_entities() {
    for (let i = 0; i < this.entities.length; i++) {
      this.entities[i].on_activate();
    }
  }

  on_deactivate(dir) {
    for (let i = 0; i < this.entities.length; i++) {
      this.entities[i].on_deactivate();
    }
    if (dir == "next") {
      this.activate_animation = this.next_activate_animation;
      this.deactivate_animation = this.next_deactivate_animation;
    } else if (dir == "prev") {
      this.activate_animation = this.prev_activate_animation;
      this.deactivate_animation = this.prev_deactivate_animation;
    }
    this.activate_animation && this.activate_animation.stop();
    this.deactivate_animation && this.deactivate_animation.start();
    if (!this.deactivate_animation) {
      this.position = V2(10000);
    }
  }

  add_entity(entity) {
    entity.parentslide = this;
    this.entities.push(entity);
  }

  add_background(entity) {
    entity.parentslide = this;
    this.backgrounds.push(entity);
  }

  tick() {
    if (this.current_delay > 0) {
      this.current_delay -= 1;  
    } else {
      if (!this.entities_activated) {
        this.activate_entities();
        this.entities_activated = true;
      }
    }

    this.weak_tick();
    for (let i = 0; i < this.entities.length; i++) {
      this.entities[i].tick();
    }
  }
  weak_tick() {
    this.activate_animation && this.activate_animation.update();
    this.deactivate_animation && this.deactivate_animation.update();
    this.activate_animation && this.activate_animation.update();
    this.deactivate_animation && this.deactivate_animation.update();
  }

  weak_draw(ctx) {
    ctx.save();

    ctx.shadowColor = "#00000055";
    ctx.shadowBlur = 30;

    ctx.translate(this.position.x, this.position.y);
    ctx.drawImage(this.canvas, -this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
    ctx.restore();
  }

  draw(ctx) {
    this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
    this.ctx.save();


    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

    for (let i = 0; i < this.backgrounds.length; i++) {
      this.backgrounds[i].draw(this.ctx);
    }

    if (this.entities_activated) {
      this.entities.sort(function(a, b) {
        if (a.depth < b.depth) {
          return -1;
        } else if (a.depth > b.depth) {
          return 1;
        }
      });

      for (let i = 0; i < this.entities.length; i++) {
        this.entities[i].draw(this.ctx);
      }
    }

    this.ctx.restore();

    ctx.save();

    ctx.shadowColor = "#00000055";
    ctx.shadowBlur = 30;

    ctx.translate(this.position.x, this.position.y);
    ctx.drawImage(this.canvas, -this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
    ctx.restore();

  }

  get_mpos(mpos) {
    return V2(((mpos.x - this.position.x) / (this.size.x / 2)) * (this.canvasSize.x / 2), ((mpos.y - this.position.y) / (this.size.y / 2)) * (this.canvasSize.y / 2))
  }

  mouse_down(mpos) {
    mpos = this.get_mpos(mpos);
    this.entities.sort(function(a, b) {
      if (a.mdepth > b.mdepth) {
        return -1;
      } else if (a.mdepth < b.mdepth) {
        return 1;
      }
    });

    for (let i = 0; i < this.entities.length; i++) {
      if (this.entities[i].mouse_down(V2(mpos.x - this.position.x, mpos.y - this.position.y))) {
        break;
      }
    }
  }

  mouse_hover(mpos) {
    mpos = this.get_mpos(mpos);
    this.entities.sort(function(a, b) {
      if (a.mdepth < b.mdepth) {
        return -1;
      } else if (a.mdepth > b.mdepth) {
        return 1;
      }
    });

    for (let i = 0; i < this.entities.length; i++) {
      if (this.entities[i].mouse_hover(V2(mpos.x - this.position.x, mpos.y - this.position.y))) {
        break;
      }
    }
  }
}

class Camera {
  constructor() {
    this.position = V2();
  }
}

class Sprite {
  constructor(paths, size) {
    this.index = -1;
    this.paths = paths;
    this.size = size;
    this.image = null;
    this.load_image = null;
    this.upgrading = false;
  }

  fix_size() {
    if (this.size == undefined) {
      this.size = V2(this.image.width, this.image.height);
    }
  }

  upgrade(callback = function() {}, level = this.index + 1) {
    if (level == "max") {
      level = this.paths.length - 1;
    }
    if (level + 1 > this.paths.length) {
      if (this.size == undefined) {
        this.size = V2(100);
      }
      if (this.image == null) {
        this.image = new Image();
      }
      callback();
      return;
    }
    if (level == this.index) {
      callback();
      return;
    }
    this.index = level;
    this.load_image = new Image();
    this.load_image.src = this.paths[this.index];
    this.upgrading = true;
    this.load_image.onload = () => {
      this.upgrading = false;
      this.image = this.load_image;
      this.fix_size();
      callback();
    }

    this.load_image.onerror = () => {
      this.upgrading = false;
      console.log("sprite upgrade error");
      this.upgrade(callback);
    }
  }

  wait() {
    while(this.upgrading) {}
  }
}

class Loader {
  constructor() {
    this.sprite = sprites["gymvr_logo"];
    this.size = V2(200);
    this.size.y = (this.size.x / this.sprite.size.x) * this.sprite.size.y;
    this.finished = false;
    this.sizem = 1;
    this.opacity = 1;
  }
  tick() {
    if (env.loaded) {
      this.opacity = lerp(this.opacity, 0, 0.2, 0.001);
      if (this.opacity == 0) {
        env.onload();
        this.finished = true;
      }
    }

    this.sizem = 1 + Math.sin(new Date() / 500) * 0.05;

  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.drawImage(this.sprite.image, (-this.size.x * this.sizem) / 2, (-this.size.y * this.sizem) / 2, this.size.x * this.sizem, this.size.y * this.sizem);
    ctx.restore();
  }
}

class Button extends Entity {
  constructor(sprite, config) {
    super();
    this.sprite = sprite;
    this.position = config.position && config.position.copy() || V2();
    this.size = config.size && config.size.copy() || V2();

    this.default_size = this.size.copy();
    this.default_position = this.position.copy();

    this.depth = config.depth || 100;
    this.mdepth = config.mdepth || this.depth;
    this.hover_animation = config.hoverAnimation;
    this.hover_animation && this.hover_animation.init(this);
    this.unhover_animation = config.unhoverAnimation;
    this.unhover_animation && this.unhover_animation.init(this);
    this.hovered_over = false;
    this.rotation = config.rotation || 0;

    this.on_press = config.onPress || function() {};
  }

  tick() {
    this.hover_animation && this.hover_animation.update();
    this.unhover_animation && this.unhover_animation.update();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);
    ctx.drawImage(this.sprite.image, -this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
    ctx.restore();
  }

  mouse_down(mpos) {
    if (this.check_mouse(mpos)) {
      this.on_press();
    }
  }

  mouse_hover(mpos) {
    if (this.check_mouse(mpos)) {
      if (!this.hovered_over) {
        this.hover_animation && this.hover_animation.start();
        this.unhover_animation && this.unhover_animation.stop();
      }
      this.hovered_over = true;
    } else {
      if (this.hovered_over) {
        this.hover_animation && this.hover_animation.stop();
        this.unhover_animation && this.unhover_animation.start();
      }
      this.hovered_over = false;
    }
    return this.hovered_over;
  }
  

}

let slides = [];
let entities = [];
let activeslide = null;

const env = {
  camera: new Camera(),
  mouse: V2(),
  tps: 60,
  loader: null,
  slideidx: 0,
  masterSlide: {
    canvasSize: V2(canvas.width, canvas.height)
  }
}

function nextslide() {
  activeslide.on_deactivate("next");
  env.slideidx += 1;
  if (env.slideidx == slides.length) {
    env.slideidx = 0;
  }
  activeslide = slides[env.slideidx];
  activeslide.on_activate("next");
}

function switchslide(idx, dir) {
  if (idx < 0 || idx >= slides.length) {
    return
  } else if (idx == env.slideidx) {
    return;
  }

  if (!dir) {
    dir = idx < env.slideidx && "prev" || "next";
  }

  activeslide.on_deactivate(dir);
  env.slideidx = idx;
  activeslide = slides[env.slideidx];
  activeslide.on_activate(dir);
}

function prevslide() {
  activeslide.on_deactivate("prev");
  env.slideidx -= 1;
  if (env.slideidx < 0) {
    env.slideidx = slides.length - 1;
  }
  activeslide = slides[env.slideidx];
  activeslide.on_activate("prev");
}

function tick() {

  if (!env.loader.finished) {
    env.loader.tick();
    return;
  }

  for (let i = 0; i < entities.length; i++) {
    entities[i].tick();
  }

  for (let i = 0; i < slides.length; i++) {
    slides[i].weak_tick();
  }

  activeslide && activeslide.tick();
}

env.loaded = false;

const drawCallback = () => draw();
let cancelDraw = false;

function draw() {
  requestAnimationFrame(drawCallback);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0,0, canvas.width, canvas.height); 

  ctx.save()
  ctx.translate(Math.round(-env.camera.position.x + canvas.width / 2), Math.round(-env.camera.position.y + canvas.height / 2));

  if (!env.loader.finished) {
    env.loader.draw();
    ctx.restore();
    return;
  }

  slides.sort(function(a, b) {
    if (a.depth < b.depth) {
      return -1;
    } else if (a.depth > b.depth) {
      return 1;
    }
  });

  activeslide && activeslide.draw(ctx);

  for (let i = 0; i < slides.length; i++) {
    slides[i].weak_draw(ctx);
  }

  entities.sort(function(a, b) {
    if (a.depth < b.depth) {
      return -1;
    } else if (a.depth > b.depth) {
      return 1;
    }
  });

  for (let i = 0; i < entities.length; i++) {
    entities[i].draw(ctx);
  }

  ctx.restore();

}

function mouse_down(event) {
  env.mouse = V2(event.layerX - canvas.width / 2 + env.camera.position.x, event.layerY + env.camera.position.y - canvas.height / 2);

  entities.sort(function(a, b) {
    if (a.mdepth > b.mdepth) {
      return -1;
    } else if (a.mdepth < b.mdepth) {
      return 1;
    }
  });

  for (let i = 0; i < entities.length; i++) {
    if (entities[i].mouse_down(env.mouse)) {
      return;
    }
  }

  if (activeslide) {
    activeslide.mouse_down(env.mouse);
  }
}

function mouse_up(event) {
  env.mouse = V2(event.layerX - canvas.width / 2 + env.camera.position.x, event.layerY + env.camera.position.y - canvas.height / 2);

  entities.sort(function(a, b) {
    if (a.mdepth > b.mdepth) {
      return -1;
    } else if (a.mdepth < b.mdepth) {
      return 1;
    }
  });

  for (let i = 0; i < entities.length; i++) {
    if (entities[i].mouse_up(env.mouse)) {
      return;
    }
  }

  if (activeslide) {
    activeslide.mouse_down(env.mouse);
  }
}

function mouse_hover(event) {
  env.mouse = V2(event.layerX - canvas.width / 2 + env.camera.position.x, event.layerY + env.camera.position.y - canvas.height / 2);

  entities.sort(function(a, b) {
    if (a.mdepth > b.mdepth) {
      return -1;
    } else if (a.mdepth < b.mdepth) {
      return 1;
    }
  });

  for (let i = 0; i < entities.length; i++) {
    if (entities[i].mouse_hover(env.mouse)) {
      return;
    }
  }

  if (activeslide) {
    activeslide.mouse_hover(env.mouse);
  }
}

function create_slides() {
  let csize = V2(1000, 750);
  // slide size multiplier
  let ssm = (600 / 750) * 0.9;
  // image hover size multiplier
  let ihsm = 1.2;
  // image slide lerp magnitude
  let islm = 0.1;
  // image enlarge lerp magnitude
  let ielm = 0.1;
  // slide slide lerp magnitude
  let sslm = 0.03;
  // slide englarge lerp magnitude
  let selm = 0.0;
  // slide enlarge from multiplier
  let sefm = 0.5;
  // text slide lerp magnitude
  let tslm = 0.1;
  // text enlarge lerp magnitude
  let telm = 0.1;
  // slide activate delay
  let sad = 10;
  // image activate delay step
  let iads = 20;


  let s = null;
  
  // slide 1
  {
  s = new Slide({
    size: V2(csize.x * ssm, csize.y * ssm),
    canvasSize: csize,
    nextActivateAnimation: new SlideInLerpAnimation("right", sslm),
    nextDeactivateAnimation: new SlideOutLerpAnimation("left", sslm),
    prevActivateAnimation: new SlideInLerpAnimation("left", sslm),
    prevDeactivateAnimation: new SlideOutLerpAnimation("right", sslm),
    activateDelay: 0
  });

  slides.push(s);

  s.add_background(new SolidBackground("#FFFFFF"));

  s.add_entity(new ImageEnt(sprites["s1/image1"], s, {
    lockImageRatio: true,
    width: 800
  }));

  }

  // slide 2
  {
  s = new Slide({
    size: V2(csize.x * ssm, csize.y * ssm),
    canvasSize: csize,
    nextActivateAnimation: new SlideInLerpAnimation("right", sslm),
    nextDeactivateAnimation: new SlideOutLerpAnimation("left", sslm),
    prevActivateAnimation: new SlideInLerpAnimation("left", sslm),
    prevDeactivateAnimation: new SlideOutLerpAnimation("right", sslm),
    activateDelay: sad
  });

  slides.push(s);
  
  s.add_background(new SolidBackground("#FFFFFF"));

  s.add_entity(new ImageEnt(sprites["s2/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(235.590, 75.033),
    width: 630.389
  }));

  s.add_entity(new ImageEnt(sprites["s2/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(112.632, 60.609),
    width: 71.211
  }));

  s.add_entity(new ImageEnt(sprites["s2/image2"], s, {
    lockImageRatio: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    depth: -1,
    topDepth: -1,
    activateDelay: iads * 1,
    position: V2(0, -50),
    width: 500
  }));

  s.add_entity(new ImageEnt(sprites["s2/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, telm),
    activateDelay: iads * 2,
    position: V2(117.331, 536.070),
    width: 753.155
  }));

  s.add_entity(new ImageEnt(sprites["s2/text2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 3,
    position: V2(118.656, 564.629),
    width: 216.075
  }));

  s.add_entity(new ImageEnt(sprites["s2/text3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", tslm),
    activateDelay: iads * 3.5,
    position: V2(344.731, 565.966),
    width: 470.157
  }));

  s.add_entity(new ImageEnt(sprites["s2/text4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 4,
    position: V2(119.107, 596.836),
    width: 247.460
  }));

  s.add_entity(new ImageEnt(sprites["s2/text5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", tslm),
    activateDelay: iads * 4.5,
    position: V2(374.434, 597.365),
    width: 390.811
  }));  

  }

  // slide 3
  {
  s = new Slide({
    size: V2(csize.x * ssm, csize.y * ssm),
    canvasSize: csize,
    nextActivateAnimation: new SlideInLerpAnimation("right", sslm),
    nextDeactivateAnimation: new SlideOutLerpAnimation("left", sslm),
    prevActivateAnimation: new SlideInLerpAnimation("left", sslm),
    prevDeactivateAnimation: new SlideOutLerpAnimation("right", sslm),
    activateDelay: sad
  });

  slides.push(s);
  
  s.add_background(new SolidBackground("#FFFFFF"));

  s.add_entity(new ImageEnt(sprites["s3/image1"], s, {
    lockImageRatio: true,
    activateAnimation: new SlideInLerpAnimation("up", islm),
    activateDelay: iads * 0,
    position: V2(-250, 0),
    height: 730
  }));

  s.add_entity(new ImageEnt(sprites["s3/image2"], s, {
    lockImageRatio: true,
    activateAnimation: new SlideInLerpAnimation("down", islm),
    activateDelay: iads * 0,
    position: V2(250, 0),
    height: 730
  }));


  }

  // slide 4
  {
  
  s = new Slide({
    size: V2(csize.x * ssm, csize.y * ssm),
    canvasSize: csize,
    nextActivateAnimation: new SlideInLerpAnimation("right", sslm),
    nextDeactivateAnimation: new SlideOutLerpAnimation("left", sslm),
    prevActivateAnimation: new SlideInLerpAnimation("left", sslm),
    prevDeactivateAnimation: new SlideOutLerpAnimation("right", sslm),
    activateDelay: sad
  });

  slides.push(s);
  
  s.add_background(new SolidBackground("#FFFFFF"));

  s.add_entity(new ImageEnt(sprites["s4/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(73.140, 86.594),
    width: 419.537
  }));

  s.add_entity(new ImageEnt(sprites["s4/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 1,
    position: V2(79.642, 147.503),
    width: 870.300
  }));

  s.add_entity(new ImageEnt(sprites["s4/text2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 2,
    position: V2(79.642, 220.788),
    width: 852.495
  }));

  s.add_entity(new ImageEnt(sprites["s4/text3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 3,
    position: V2(79.642, 350.854),
    width: 857.432
  }));

  s.add_entity(new ImageEnt(sprites["s4/text4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 4,
    position: V2(95.459, 423.184),
    width: 829.376
  }));

  s.add_entity(new ImageEnt(sprites["s4/text5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 4.5,
    position: V2(95.459, 453.340),
    width: 829.376
  }));

  s.add_entity(new ImageEnt(sprites["s4/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    depth: -1,
    topDepth: -1,
    activateDelay: iads * 5,
    position: V2(79.642, 507.903),
    width: 176.000
  }));

  }

  // slide 5
  {
  s = new Slide({
    size: V2(csize.x * ssm, csize.y * ssm),
    canvasSize: csize,
    nextActivateAnimation: new SlideInLerpAnimation("right", sslm),
    nextDeactivateAnimation: new SlideOutLerpAnimation("left", sslm),
    prevActivateAnimation: new SlideInLerpAnimation("left", sslm),
    prevDeactivateAnimation: new SlideOutLerpAnimation("right", sslm),
    activateDelay: sad
  });

  slides.push(s);
  
  s.add_background(new SolidBackground("#FFFFFF"));

  s.add_entity(new ImageEnt(sprites["s5/text1"], s, {
    lockImageRatio: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, telm),
    activateDelay: iads * 0,
    width: 154.242
  }));

  s.add_entity(new ImageEnt(sprites["s5/sc1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    activateDelay: iads * 1.5,
    position: V2(379.022, 34.579),
    width: 241.957
  }));

  s.add_entity(new ImageEnt(sprites["s5/sc2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    activateDelay: iads * 2,
    position: V2(560.792, 64.453),
    width: 249.754
  }));

  s.add_entity(new ImageEnt(sprites["s5/sc3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    activateDelay: iads * 2.5,
    position: V2(628.286, 254.022),
    width: 212.135
  }));

  s.add_entity(new ImageEnt(sprites["s5/sc4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    activateDelay: iads * 3,
    position: V2(560.792, 435.792),
    width: 249.753
  }));

  s.add_entity(new ImageEnt(sprites["s5/sc5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    activateDelay: iads * 3.5,
    position: V2(379.022, 503.289),
    width: 241.957
  }));

  s.add_entity(new ImageEnt(sprites["s5/sc6"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    activateDelay: iads * 4,
    position: V2(189.454, 435.793),
    width: 249.754
  }));

  s.add_entity(new ImageEnt(sprites["s5/sc7"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    activateDelay: iads * 4.5,
    position: V2(159.579, 254.022),
    width: 212.135
  }));

  s.add_entity(new ImageEnt(sprites["s5/sc8"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    callback: () => switchslide(7 - 1),
    activateDelay: iads * 1,
    position: V2(189.455, 64.454),
    width: 249.753
  }));


  }

  // slide 6
  {
  s = new Slide({
    size: V2(csize.x * ssm, csize.y * ssm),
    canvasSize: csize,
    nextActivateAnimation: new SlideInLerpAnimation("right", sslm),
    nextDeactivateAnimation: new SlideOutLerpAnimation("left", sslm),
    prevActivateAnimation: new SlideInLerpAnimation("left", sslm),
    prevDeactivateAnimation: new SlideOutLerpAnimation("right", sslm),
    activateDelay: sad
  });

  slides.push(s);
  
  s.add_background(new SolidBackground("#FFFFFF"));

  s.add_entity(new ImageEnt(sprites["s6/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("left", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(69.585, 287.254),
    width: 207.734
  }));

  s.add_entity(new ImageEnt(sprites["s6/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 2,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#0000FF",
    outlineWidth: 5,
    position: V2(53.538, 63.640),
    width: 264.660
  }));

  s.add_entity(new ImageEnt(sprites["s6/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#FF0000",
    outlineWidth: 4,
    position: V2(368.706, 75.761),
    width: 193.949
  }));

  s.add_entity(new ImageEnt(sprites["s6/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 4,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth: 1,
    position: V2(603.061, 74.751),
    width: 239.406
  }));

  s.add_entity(new ImageEnt(sprites["s6/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#FF0000",
    outlineWidth: 5,
    position: V2(65.660, 344.462),
    width: 222.234
  }));

  s.add_entity(new ImageEnt(sprites["s6/image5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 6,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#00FF00",
    outlineWidth: 6,
    depth: 2,
    position: V2(324.259, 239.406),
    width: 333.350
  }));

  s.add_entity(new ImageEnt(sprites["s6/image6"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 7,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(692.965, 229.305),
    width: 243.447
  }));

  s.add_entity(new ImageEnt(sprites["s6/image7"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 8,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth: 1,
    outlineColor: "#00FFFF",
    outlineWidth: 5,
    position: V2(107.076, 489.924),
    width: 227.284
  }));

  s.add_entity(new ImageEnt(sprites["s6/image8"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 9,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(350.523, 505.076),
    width: 231.325
  }));

  s.add_entity(new ImageEnt(sprites["s6/image9"], s, {
    lockImageRatio: false, //true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 10,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#5050FF",
    outlineWidth: 4,
    position: V2(625.284,455.579),
    size: V2(296.985, 214.152)
  }));
  }
  
  // slide 7: Škola ponúka priestor na rozvoj talentu a záujmov
  {
  s = new Slide({
    size: V2(csize.x * ssm, csize.y * ssm),
    canvasSize: csize,
    nextActivateAnimation: new SlideInLerpAnimation("right", sslm),
    nextDeactivateAnimation: new SlideOutLerpAnimation("left", sslm),
    prevActivateAnimation: new SlideInLerpAnimation("left", sslm),
    prevDeactivateAnimation: new SlideOutLerpAnimation("right", sslm),
    activateDelay: sad
  });

  

  slides.push(s);
  
  s.add_background(new SolidBackground("#FFFF80"));

  s.add_entity(new ImageEnt(sprites["s7/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(93.330, 65.105),
    width: 396.063
  }));

  s.add_entity(new ImageEnt(sprites["s7/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 1,
    position: V2(66.165, 210.322),
    width: 378.096
  }));

  s.add_entity(new ImageEnt(sprites["s7/text2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 2,
    position: V2(66.165, 242.848),
    width: 393.487
  }));

  s.add_entity(new ImageEnt(sprites["s7/text3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 3,
    position: V2(66.165, 297.693),
    width: 447.901
  }));

  s.add_entity(new ImageEnt(sprites["s7/text4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 4,
    position: V2(66.165, 354.767),
    width: 416.104
  }));

  s.add_entity(new ImageEnt(sprites["s7/text5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 5,
    position: V2(66.165, 428.569),
    width: 263.682
  }));

  s.add_entity(new ImageEnt(sprites["s7/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 1,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(530.714, 70.714),
    width: 170.714
  }));

  s.add_entity(new ImageEnt(sprites["s7/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 2,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(727.857, 70.714),
    width: 214.286
  }));

  s.add_entity(new ImageEnt(sprites["s7/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", islm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(51.429, 459.286),
    width: 301.429
  }));

  s.add_entity(new ImageEnt(sprites["s7/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", islm),
    activateDelay: iads * 4,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(367.143, 458.571),
    width: 267.857
  }));

  s.add_entity(new ImageEnt(sprites["s7/image5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", islm),
    activateDelay: iads * 5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(646.429, 493.571),
    width: 297.143
  }));
  }

  // slide 8: Škola ponúka priestor na rozvoj talentu a záujmov
  {
  s = new Slide({
    size: V2(csize.x * ssm, csize.y * ssm),
    canvasSize: csize,
    nextActivateAnimation: new SlideInLerpAnimation("right", sslm),
    nextDeactivateAnimation: new SlideOutLerpAnimation("left", sslm),
    prevActivateAnimation: new SlideInLerpAnimation("left", sslm),
    prevDeactivateAnimation: new SlideOutLerpAnimation("right", sslm),
    activateDelay: sad
  });

  slides.push(s);

  s.add_background(new SolidBackground("#FFFF80"));

  s.add_entity(new ImageEnt(sprites["s8/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(77.394, 73.152),
    width: 346.555
  }));

  s.add_entity(new ImageEnt(sprites["s8/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", tslm),
    activateDelay: iads * 1,
    position: V2(360, 148.311),
    width: 281.865
  }));

  s.add_entity(new ImageEnt(sprites["s8/text2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", tslm),
    activateDelay: iads * 2,
    position: V2(360, 242.438),
    width: 251.738
  }));

  s.add_entity(new ImageEnt(sprites["s8/text3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", tslm),
    activateDelay: iads * 3,
    position: V2(360, 332.932),
    width: 293.320
  }));

  s.add_entity(new ImageEnt(sprites["s8/text4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", tslm),
    activateDelay: iads * 4,
    position: V2(360, 451.697),
    width: 289.395
  }));

  s.add_entity(new ImageEnt(sprites["s8/text5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", tslm),
    activateDelay: iads * 5,
    position: V2(360, 540.985),
    width: 301.289
  }));

  s.add_entity(new ImageEnt(sprites["s8/text6"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", tslm),
    activateDelay: iads * 6,
    position: V2(360, 607.415),
    width: 186.670
  }));

  s.add_entity(new ImageEnt(sprites["s8/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 1,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(64.650, 203.041),
    width: 268.701
  }));

  s.add_entity(new ImageEnt(sprites["s8/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 1,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(695.995, 139.401),
    width: 256.579
  }));

  }

  // slide 9: Škola ponúka priestor na rozvoj talentu a záujmov
  {
    s = new Slide({
      size: V2(csize.x * ssm, csize.y * ssm),
      canvasSize: csize,
      nextActivateAnimation: new SlideInLerpAnimation("right", sslm),
      nextDeactivateAnimation: new SlideOutLerpAnimation("left", sslm),
      prevActivateAnimation: new SlideInLerpAnimation("left", sslm),
      prevDeactivateAnimation: new SlideOutLerpAnimation("right", sslm),
      activateDelay: sad
    });
  
    slides.push(s);
  
    s.add_background(new SolidBackground("#FFFF80"));
  
    s.add_entity(new ImageEnt(sprites["s9/title"], s, {
      lockImageRatio: true,
      leftCornerPos: true,
      leftCanvasPos: true,
      activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
      activateDelay: iads * 0,
      position: V2(83.026, 68.481),
      width: 303.625
    }));
  
    s.add_entity(new ImageEnt(sprites["s9/text1"], s, {
      lockImageRatio: true,
      leftCornerPos: true,
      leftCanvasPos: true,
      activateAnimation: new SlideInLerpAnimation("right", tslm),
      activateDelay: iads * 1,
      position: V2(424.926, 59.179),
      width: 439.739
    }));


    s.add_entity(new ImageEnt(sprites["s9/text2"], s, {
      lockImageRatio: true,
      leftCornerPos: true,
      leftCanvasPos: true,
      activateAnimation: new SlideInLerpAnimation("right", tslm),
      activateDelay: iads * 2,
      position: V2(424.926, 188.031),
      width: 283.705
    }));

    s.add_entity(new ImageEnt(sprites["s9/text3"], s, {
      lockImageRatio: true,
      leftCornerPos: true,
      leftCanvasPos: true,
      activateAnimation: new SlideInLerpAnimation("right", tslm),
      activateDelay: iads * 3,
      position: V2(424.926, 222.610),
      width: 170.594
    }));

    s.add_entity(new ImageEnt(sprites["s9/text4"], s, {
      lockImageRatio: true,
      leftCornerPos: true,
      leftCanvasPos: true,
      activateAnimation: new SlideInLerpAnimation("right", tslm),
      activateDelay: iads * 4,
      position: V2(424.926, 257.960),
      width: 498.360
    }));
  
    s.add_entity(new ImageEnt(sprites["s9/image1"], s, {
      lockImageRatio: true,
      leftCornerPos: true,
      leftCanvasPos: true,
      activateAnimation: new SlideInLerpAnimation("left", islm),
      activateDelay: iads * 1,
      hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
      unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
      shadowDraw: true,
      position: V2(67.857, 201.429),
      width: 270.000
    }));

    s.add_entity(new ImageEnt(sprites["s9/image2"], s, {
      lockImageRatio: true,
      leftCornerPos: true,
      leftCanvasPos: true,
      activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
      activateDelay: iads * 1.5,
      hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
      unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
      shadowDraw: true,
      depth: 1,
      position: V2(66.429, 322.857),
      width: 135.714
    }));

    s.add_entity(new ImageEnt(sprites["s9/image3"], s, {
      lockImageRatio: true,
      leftCornerPos: true,
      leftCanvasPos: true,
      activateAnimation: new SlideInLerpAnimation("left", islm),
      activateDelay: iads * 2,
      hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
      unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
      shadowDraw: true,
      depth: 0,
      position: V2(72.857, 456.429),
      width: 321.429
    }));

    s.add_entity(new ImageEnt(sprites["s9/image4"], s, {
      lockImageRatio: true,
      leftCornerPos: true,
      leftCanvasPos: true,
      activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
      activateDelay: iads * 3,
      hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
      unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
      shadowDraw: true,
      depth: 1,
      position: V2(359.286, 344.286),
      width: 365.000
    }));

    s.add_entity(new ImageEnt(sprites["s9/image5"], s, {
      lockImageRatio: true,
      leftCornerPos: true,
      leftCanvasPos: true,
      activateAnimation: new SlideInLerpAnimation("right", islm),
      activateDelay: iads * 4,
      hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
      unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
      shadowDraw: true,
      depth: 2,
      position: V2(635.000, 452.857),
      width: 280.714
    }));

  
  
  }

  // slide 10: 
  {
  s = new Slide({
    size: V2(csize.x * ssm, csize.y * ssm),
    canvasSize: csize,
    nextActivateAnimation: new SlideInLerpAnimation("right", sslm),
    nextDeactivateAnimation: new SlideOutLerpAnimation("left", sslm),
    prevActivateAnimation: new SlideInLerpAnimation("left", sslm),
    prevDeactivateAnimation: new SlideOutLerpAnimation("right", sslm),
    activateDelay: sad
  });

  slides.push(s);

  s.add_background(new SolidBackground("#FFFF80"));

  s.add_entity(new ImageEnt(sprites["s10/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    shadowDraw: true,
    shadowBlur: 3,
    position: V2(257.936, 49.617),
    width: 409.128
  }));

  s.add_entity(new ImageEnt(sprites["s10/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, telm),
    activateDelay: iads * 0.5,
    position: V2(328.963, 96.993),
    width: 254.977
  }));

  s.add_entity(new ImageEnt(sprites["s10/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 1,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    rotation: -(5 / 180) * Math.PI,
    position: V2(44.350, 94.104),
    width: 218.352
  }));

  s.add_entity(new ImageEnt(sprites["s10/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 2,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(297.143, 180.714),
    width: 383.571
  }));

  s.add_entity(new ImageEnt(sprites["s10/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(688.419, 46.467),
    width: 276.782
  }));

  s.add_entity(new ImageEnt(sprites["s10/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", islm),
    activateDelay: iads * 4,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth: 1,
    position: V2(140.714, 445.714),
    width: 330.714
  }));

  s.add_entity(new ImageEnt(sprites["s10/image5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", islm),
    activateDelay: iads * 5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    rotation: (4 / 180) * Math.PI,
    position: V2(522.895, 428.518),
    width: 416.755
  }));


  }
}

let sprites = {};

let toLoad = 0;

function preload_sprites(callback) {
  let S = {
    "s1": ["image1.png"],
    "s2": ["title.png", "text1.png", "text2.png", "text3.png", "text4.png", "text5.png", "image1.png", "image2.jpg"],
    "s3": ["image1.jpg", "image2.png"],
    "s4": ["image1.jpg", "title.png", "text1.png", "text2.png", "text3.png", "text4.png", "text5.png"],
    "s5": ["text1.png", "sc1.png", "sc2.png", "sc3.png", "sc4.png", "sc5.png", "sc6.png", "sc7.png", "sc8.png"],
    "s6": ["text1.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg", "image6.jpg", "image7.jpg", "image8.jpg", "image9.jpg"],
    "s7": ["title.png", "text1.png", "text2.png", "text3.png", "text4.png", "text5.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    "s8": ["title.png", "text1.png", "text2.png", "text3.png", "text4.png", "text5.png", "text6.png", "image1.jpg", "image2.jpg"],
    "s9": ["title.png", "text1.png", "text2.png", "text3.png", "text4.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    "s10": ["title.png", "text1.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
  }

  for (slide of Object.keys(S)) {
    for (image of S[slide]) {
      toLoad++;
      console.log(slide + "/" + image);
      let s = new Sprite(["assets/" + slide + "/min/" + image, "assets/" + slide + "/max/" + image]);
      s.upgrade(callback);
      sprites[slide + "/" + image.split(".")[0]] = s;
    }
  }

  toLoad++;
  sprites["arrow"] = new Sprite(["assets/arrow.png"]);
  sprites["arrow"].upgrade(callback, );
}

env.onload = () => {
  create_slides();
  activeslide = slides[0];
  activeslide.on_activate();

  entities.push(
    new Button(sprites["arrow"], {
      position: V2(-canvas.width / 2 + 30, 0),
      size: V2(30, 30),
      depth: 100,
      onPress: () => prevslide(),
      rotation: Math.PI * (1/2),
      hoverAnimation: new EnlargeLerpAnimation(undefined, 1.2, 0.3),
      unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, 0.3)
    })
  );

  entities.push(
    new Button(sprites["arrow"], {
      position: V2(canvas.width / 2 - 30, 0),
      size: V2(30, 30),
      depth: 100,
      rotation: Math.PI * (3/2),
      onPress: () => nextslide(),
      hoverAnimation: new EnlargeLerpAnimation(undefined, 1.2, 0.3),
      unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, 0.3)
    })
  );

};

function main() {
  canvas.addEventListener("mousedown", (event) => mouse_down(event));
  canvas.addEventListener("mouseup", (event) => mouse_up(event));
  canvas.addEventListener("mousemove", (event) => mouse_hover(event));

  sprites["gymvr_logo"].wait();

  console.log("bruh");
  
  preload_sprites(() => {
    toLoad--;
    if (toLoad <= 0) {
      env.loaded = true;
    }
  });

  env.loader = new Loader();

  console.log(env);


  env.tickInterval = setInterval(() => tick(), 1000 / env.tps);
  requestAnimationFrame(drawCallback);
}

sprites["gymvr_logo"] = new Sprite(["assets/logo.png"]);
sprites["gymvr_logo"].upgrade();

window.onload = main;