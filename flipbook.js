{
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
      //console.log("sprite upgrade error");
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

class ToggleButton extends Button {
  constructor(sprite, config) {
    super(sprite, config);
    this.sprites = [this.sprite, ...config.sprites];
    this.state_count = config.stateCount || this.sprites.length;
    this.callbacks = [...config.callbacks];
    this.state = config.state || 0;
    this.sprite = this.sprites[this.state];
  }

  mouse_down(mpos) {
    if (this.check_mouse(mpos)) {
      this.callbacks[this.state]();
      this.state++;
      if (this.state >= this.state_count) {
        this.state = 0;
      }
      this.sprite = this.sprites[this.state];
    }
  }

  set_state(state) {
    if (state < 0 || state >= this.state_count) {
      return;
    }
    this.state = state;
    this.sprite = this.sprites[this.state];
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
  playing: true,
  slide_duration: 300,
  play_timer: 300,
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

  if (env.playing) {
    env.play_timer -= 1;
    if (env.play_timer <= 0) {
      nextslide();
      env.play_timer = env.slide_duration;
    }
  }
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
  env.mouse = V2((event.pageX - canvas.offsetLeft) - canvas.width / 2 + env.camera.position.x, (event.pageY - canvas.offsetTop) + env.camera.position.y - canvas.height / 2);

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
  env.mouse = V2((event.pageX - canvas.offsetLeft) - canvas.width / 2 + env.camera.position.x, (event.pageY - canvas.offsetTop) + env.camera.position.y - canvas.height / 2);

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
  env.mouse = V2((event.pageX - canvas.offsetLeft) - canvas.width / 2 + env.camera.position.x, (event.pageY - canvas.offsetTop) + env.camera.position.y - canvas.height / 2);

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
  let sslm = 0.02;
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
    position: V2(60.714, 84.401),
    width: 386.098
  }));

  s.add_entity(new ImageEnt(sprites["s4/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 1,
    position: V2(60.714, 147.503),
    width: 870.870
  }));

  s.add_entity(new ImageEnt(sprites["s4/text2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 2,
    position: V2(60.714, 258.386),
    width: 852.325
  }));

  s.add_entity(new ImageEnt(sprites["s4/text3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 3,
    position: V2(60.714, 369.510),
    width: 857.432
  }));

  s.add_entity(new ImageEnt(sprites["s4/text4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 4,
    position: V2(75.256, 447.746),
    width: 829.376
  }));

  s.add_entity(new ImageEnt(sprites["s4/text5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 4.5,
    position: V2(75.256, 473.340),
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
    position: V2(60.714, 540.657),
    width: 176.000
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
    callback: () => switchslide(11 - 1),
    activateDelay: iads * 1,
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
    callback: () => switchslide(15 - 1),
    activateDelay: iads * 1.5,
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
    activateDelay: iads * 2,
    callback: () => switchslide(20 -1),
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
    callback: () => switchslide(13 - 1),
    shadowDraw: true,
    activateDelay: iads * 2.5,
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
    callback: () => switchslide(22 -1),
    activateDelay: iads * 3,
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
    callback: () => switchslide(19 -1),
    shadowDraw: true,
    activateDelay: iads * 2.5,
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
    activateDelay: iads * 2,
    callback: () => switchslide(14 - 1),
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
    activateDelay: iads * 1.5,
    position: V2(189.455, 64.454),
    width: 249.753
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
      position: V2(63.026, 68.481),
      width: 340.625
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
    depth: 1,
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
    outlineColor: "#c00000",
    outlineWidth: 5,
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
    outlineColor: "#ffc000",
    outlineWidth: 5,
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

  // slide 11:
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

  s.add_background(new SolidBackground("#FFC000"));

  s.add_entity(new ImageEnt(sprites["s11/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(60.393, 67.869),
    width: 234.369
  }));

  s.add_entity(new ImageEnt(sprites["s11/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 1,
    position: V2(63.305, 259.624),
    width: 230.520
  }));

  s.add_entity(new ImageEnt(sprites["s11/text2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", tslm),
    activateDelay: iads * 2,
    position: V2(642.637, 340.440),
    width: 317.276
  }));

  s.add_entity(new ImageEnt(sprites["s11/text3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 3,
    position: V2(188.598, 636.701),
    width: 232.578
  }));

  s.add_entity(new ImageEnt(sprites["s11/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 1,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(382.857, 75.714),
    width: 343.571
  }));

  s.add_entity(new ImageEnt(sprites["s11/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 1.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(742.143, 107.143),
    width: 165.714
  }));

  s.add_entity(new ImageEnt(sprites["s11/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 2,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(72.691, 319.452),
    width: 318.023
  }));

  s.add_entity(new ImageEnt(sprites["s11/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 2.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    rotation: (4 / 180) * Math.PI,
    depth: 1,
    position: V2(447.487, 297.913),
    width: 175.286
  }));

  s.add_entity(new ImageEnt(sprites["s11/image5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(465.000, 498.571),
    width: 403.571
  }));

  }

  // slide 12
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

  s.add_background(new SolidBackground("#FFC000"));

  s.add_entity(new ImageEnt(sprites["s12/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(96.199, 55.055),
    width: 382.421
  }));

  s.add_entity(new ImageEnt(sprites["s12/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 1,
    position: V2(72.165, 124.852),
    width: 459.268
  }));

  s.add_entity(new ImageEnt(sprites["s12/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 2,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(663.670, 53.538),
    width: 292.944
  }));

  s.add_entity(new ImageEnt(sprites["s12/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 2.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(76.772, 223.244),
    width: 299.005
  }));

  s.add_entity(new ImageEnt(sprites["s12/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(414.163, 215.162),
    width: 140.411
  }));

  s.add_entity(new ImageEnt(sprites["s12/image5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 3.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(76.772, 454.569),
    width: 300.015
  }));

  s.add_entity(new ImageEnt(sprites["s12/image6"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", islm),
    activateDelay: iads * 4,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(388.919, 448.305),
    width: 241.426
  }));

  s.add_entity(new ImageEnt(sprites["s12/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 4.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth: 1,
    position: V2(575.787, 240.416),
    width: 290.924
  }));

  s.add_entity(new ImageEnt(sprites["s12/image7"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#c55a11",
    oultineWidth: 5,
    position: V2(643.467, 459.619),
    width: 323.249
  }));



  }

  // slide 13
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

  s.add_background(new SolidBackground("#FF9999"));
  

  s.add_entity(new ImageEnt(sprites["s13/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(74.826, 58.068),
    width: 203.000
  }));

  s.add_entity(new ImageEnt(sprites["s13/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 1,
    position: V2(81.190, 190.242),
    width: 340.922
  }));

  s.add_entity(new ImageEnt(sprites["s13/text2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 2,
    position: V2(81.190, 246.360),
    width: 343.156
  }));

  s.add_entity(new ImageEnt(sprites["s13/text3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", tslm),
    activateDelay: iads * 3,
    position: V2(520.308, 317.801),
    width: 439.339
  }));

  s.add_entity(new ImageEnt(sprites["s13/text4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, telm),
    activateDelay: iads * 5,
    position: V2(510.127, 449.518),
    width: 426.284
  }));

  s.add_entity(new ImageEnt(sprites["s13/text5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", tslm),
    activateDelay: iads * 4,
    position: V2(684.647, 556.975),
    width: 241.316
  }));

  s.add_entity(new ImageEnt(sprites["s13/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 1.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(327.289, 61.619),
    width: 183.848
  }));

  s.add_entity(new ImageEnt(sprites["s13/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 1,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(530.000, 57.857),
    width: 376.429
  }));

  s.add_entity(new ImageEnt(sprites["s13/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 2,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(81.190, 442.952),
    width: 351.156
  }));

  s.add_entity(new ImageEnt(sprites["s13/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 2.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth: 1,
    position: V2(235.366, 422.749),
    width: 235.871
  }));

  s.add_entity(new ImageEnt(sprites["s13/image5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", islm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(457.094, 548.008),
    width: 196.475
  }));

  }

  // slide 14
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

  s.add_background(new SolidBackground("#99ff66"));
  

  s.add_entity(new ImageEnt(sprites["s14/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(80.909, 63.650),
    width: 680.291
  }));

  s.add_entity(new ImageEnt(sprites["s14/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 1,
    position: V2(422.924, 213.148),
    width: 243.105
  }));

  s.add_entity(new ImageEnt(sprites["s14/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 2,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(71.429, 202.857),
    width: 323.571
  }));

  s.add_entity(new ImageEnt(sprites["s14/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 2.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(702.857, 200.000),
    width: 262.143
  }));

  s.add_entity(new ImageEnt(sprites["s14/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(70.714, 459.286),
    width: 343.581
  }));

  s.add_entity(new ImageEnt(sprites["s14/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 3.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(437.143, 431.429),
    width: 377.857
  }));

  s.add_entity(new ImageEnt(sprites["s14/image5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 4,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(716.429, 542.857),
    width: 228.571
  }));

  }

  // slide 15

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

  s.add_background(new SolidBackground("#ffccff"));
  

  s.add_entity(new ImageEnt(sprites["s15/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(77.133, 77.002),
    width: 270.650
  }));

  s.add_entity(new ImageEnt(sprites["s15/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 1,
    position: V2(74.925, 180.328),
    width: 208.230
  }));

  s.add_entity(new ImageEnt(sprites["s15/text2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 1.5,
    position: V2(75.225, 216.950),
    width: 281.092
  }));

  s.add_entity(new ImageEnt(sprites["s15/text3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 2,
    position: V2(75.225, 298.010),
    width: 285.161
  }));

  s.add_entity(new ImageEnt(sprites["s15/text4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 2.5,
    position: V2(75.225, 384.881),
    width: 293.309
  }));

  s.add_entity(new ImageEnt(sprites["s15/text5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 3.5,
    position: V2(75.225, 500.487),
    width: 207.229
  }));

  s.add_entity(new ImageEnt(sprites["s15/text6"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 4.5,
    position: V2(75.225, 536.909),
    width: 257.537
  }));

  s.add_entity(new ImageEnt(sprites["s15/text7"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 5,
    position: V2(75.225, 594.490),
    width: 265.430
  }));

  s.add_entity(new ImageEnt(sprites["s15/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 1,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(385.714, 51.429),
    width: 508.571
  }));

  s.add_entity(new ImageEnt(sprites["s15/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 2,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(554.286, 307.143),
    width: 397.143
  }));

  s.add_entity(new ImageEnt(sprites["s15/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth: 1,
    position: V2(428.571, 285.714),
    width: 212.143
  }));

  s.add_entity(new ImageEnt(sprites["s15/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 4,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth: 1,
    position: V2(412.142, 527.300),
    width: 341.432
  }));
  }

  // slide 16
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

  s.add_background(new SolidBackground("#ffffff"));

  s.add_entity(new ImageEnt(sprites["s16/image1"], s, {
    lockImageRatio: true,
    activateAnimation: new SlideInLerpAnimation("up", islm),
    activateDelay: iads * 0,
    position: V2(),
    height: 730
  }));

  }

  // slide 17
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

  s.add_background(new SolidBackground("#ffccff"));
  

  s.add_entity(new ImageEnt(sprites["s17/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(43.061, 46.909),
    width: 446.756
  }));

  s.add_entity(new ImageEnt(sprites["s17/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 1,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#FFFFFF",
    outlineWidth: 5,
    position: V2(33.571, 167.857),
    width: 495.000
  }));

  s.add_entity(new ImageEnt(sprites["s17/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 2,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#FFFFFF",
    outlineWidth: 5,
    position: V2(540.937, 62.629),
    width: 408.607
  }));

  s.add_entity(new ImageEnt(sprites["s17/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#FFFFFF",
    outlineWidth: 5,
    position: V2(46.467, 496.995),
    width: 293.954
  }));

  s.add_entity(new ImageEnt(sprites["s17/image5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", islm),
    activateDelay: iads * 4,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#FFFFFF",
    outlineWidth: 5,
    position: V2(360.119, 503.561),
    width: 360.624
  }));

  s.add_entity(new ImageEnt(sprites["s17/image6"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth: 1,
    position: V2(740.947, 306.581),
    width: 222.234
  }));

  s.add_entity(new ImageEnt(sprites["s17/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 6,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#FFFFFF",
    outlineWidth: 5,
    depth: 2,
    position: V2(424.286, 261.429),
    width: 357.857
  }));



  }

  // slide 18
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

  s.add_background(new SolidBackground("#ffccff"));
  

  s.add_entity(new ImageEnt(sprites["s18/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(32.423, 55.308),
    width: 776.496
  }));

  s.add_entity(new ImageEnt(sprites["s18/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 1,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#2eb5f3",
    outlineWidth: 5,
    position: V2(76.429, 114.286),
    width: 407.857
  }));

  s.add_entity(new ImageEnt(sprites["s18/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 2,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#ff0000",
    outlineWidth: 5,
    position: V2(532.857, 122.857),
    width: 320.714
  }));

  s.add_entity(new ImageEnt(sprites["s18/image5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#ffff2d",
    outlineWidth: 5,
    position: V2(533.571, 375.714),
    width: 413.571
  }));

  s.add_entity(new ImageEnt(sprites["s18/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 4,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth: 1,
    position: V2(207.857, 372.857),
    width: 299.286
  }));

  s.add_entity(new ImageEnt(sprites["s18/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 4.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(72.857, 502.143),
    width: 225.714
  }));

  }

  // slide 19
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

  s.add_background(new SolidBackground("#66ffff"));
  

  s.add_entity(new ImageEnt(sprites["s19/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(64.351, 42.870),
    width: 244.283
  }));

  s.add_entity(new ImageEnt(sprites["s19/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 1,
    position: V2(79.105, 327.412),
    width: 111.152
  }));

  s.add_entity(new ImageEnt(sprites["s19/text2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 1.5,
    position: V2(79.105, 360.983),
    width: 194.424
  }));

  s.add_entity(new ImageEnt(sprites["s19/text3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 2,
    position: V2(79.105, 398.844),
    width: 219.990
  }));

  s.add_entity(new ImageEnt(sprites["s19/text4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 2.5,
    position: V2(79.105, 430.988),
    width: 71.777
  }));

  s.add_entity(new ImageEnt(sprites["s19/text5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 3,
    position: V2(79.105, 465.983),
    width: 156.367
  }));

  s.add_entity(new ImageEnt(sprites["s19/text6"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 4,
    position: V2(79.105, 538.131),
    width: 203.320
  }));

  s.add_entity(new ImageEnt(sprites["s19/text7"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 5,
    position: V2(79.105, 570.575),
    width: 322.696
  }));

  s.add_entity(new ImageEnt(sprites["s19/text8"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 5.5,
    position: V2(79.105, 655.984),
    width: 279.824
  }));

  s.add_entity(new ImageEnt(sprites["s19/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 1,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#ffffff",
    outlineWidth: 5,
    depth: 1,
    position: V2(412.857, 49.286),
    width: 213.571
  }));

  s.add_entity(new ImageEnt(sprites["s19/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 1.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(671.246, 44.447),
    width: 264.155
  }));

  s.add_entity(new ImageEnt(sprites["s19/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 2.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(341.432, 180.817),
    width: 317.188
  }));

  s.add_entity(new ImageEnt(sprites["s19/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(725.290, 270.721),
    width: 176.777
  }));

  s.add_entity(new ImageEnt(sprites["s19/image6"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 4,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(627.305, 532.350),
    width: 260.619
  }));

  s.add_entity(new ImageEnt(sprites["s19/image5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 4.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth: 1,
    position: V2(424.264, 442.447),
    width: 246.477
  }));

  




  }

  // slide 20
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

  s.add_background(new SolidBackground("#6699ff"));
  

  s.add_entity(new ImageEnt(sprites["s20/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(51.945, 57.153),
    width: 360.526
  }));

  s.add_entity(new ImageEnt(sprites["s20/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 1,
    position: V2(48.601, 252.036),
    width: 190.090
  }));

  s.add_entity(new ImageEnt(sprites["s20/text2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 2,
    position: V2(48.601, 352.037),
    width: 178.195
  }));

  s.add_entity(new ImageEnt(sprites["s20/text3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 3,
    position: V2(48.601, 419.183),
    width: 125.180
  }));

  s.add_entity(new ImageEnt(sprites["s20/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 1,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#ffffff",
    outlineWidth: 5,
    position: V2(451.429, 30.000),
    width: 431.429
  }));

  s.add_entity(new ImageEnt(sprites["s20/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 2.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth:1,
    position: V2(252.857, 255.714),
    width: 368.571
  }));

  s.add_entity(new ImageEnt(sprites["s20/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 2,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth:1,
    position: V2(660.000, 225.000),
    width: 317.143
  }));

  s.add_entity(new ImageEnt(sprites["s20/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 3.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(48.601, 524.286),
    width: 257.828
  }));

  s.add_entity(new ImageEnt(sprites["s20/image5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", islm),
    activateDelay: iads * 4.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(347.857, 525.714),
    width: 243.571
  }));

  s.add_entity(new ImageEnt(sprites["s20/image6"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 3.5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#FFFFFF",
    outlineWidth: 5,
    position: V2(637.143, 479.286),
    width: 338.571
  }));
  }

  // slide 21
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

  s.add_background(new SolidBackground("#6699ff"));
  

  s.add_entity(new ImageEnt(sprites["s21/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(89.712, 65.297),
    width: 302.029
  }));

  s.add_entity(new ImageEnt(sprites["s21/text1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 1,
    position: V2(83.307, 127.905),
    width: 231.836
  }));

  s.add_entity(new ImageEnt(sprites["s21/text2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 2,
    position: V2(83.307, 248.179),
    width: 166.524
  }));

  s.add_entity(new ImageEnt(sprites["s21/text3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", tslm),
    activateDelay: iads * 3,
    position: V2(83.307, 280.799),
    width: 188.291
  }));

  s.add_entity(new ImageEnt(sprites["s21/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 2,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#8497b0",
    outlineWidth: 3,
    depth: 1,
    position: V2(544.286, 31.429),
    width: 399.2862
  }));

  s.add_entity(new ImageEnt(sprites["s21/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 1,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#c00000",
    outlineWidth: 5,
    position: V2(434.286, 218.571),
    width: 476.429
  }));

  s.add_entity(new ImageEnt(sprites["s21/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth: 1,
    position: V2(49.286, 355.714),
    width: 384.286
  }));

  s.add_entity(new ImageEnt(sprites["s21/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("down", islm),
    activateDelay: iads * 4,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    depth: 2,
    position: V2(351.429, 525.000),
    width: 266.429
  }));

  s.add_entity(new ImageEnt(sprites["s21/image5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(667.143, 510.000),
    width: 274.286
  }));
  
  }

  // slide 22

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

  s.add_background(new SolidBackground("#ffffff"));
  

  s.add_entity(new ImageEnt(sprites["s22/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(110.382, 54.551),
    width: 328.570
  }));

  s.add_entity(new ImageEnt(sprites["s22/image1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 1,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#800000",
    outlineWidth: 5,
    position: V2(60.609, 110.107),
    width: 381.838
  }));

  s.add_entity(new ImageEnt(sprites["s22/image3"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 2,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#0070c0",
    outlineWidth: 5,
    depth: 1,
    position: V2(394.970, 256.579),
    width: 250.518
  }));

  s.add_entity(new ImageEnt(sprites["s22/image5"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 3,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    position: V2(671.429, 280.000),
    width: 277.143
  }));

  s.add_entity(new ImageEnt(sprites["s22/image2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("right", islm),
    activateDelay: iads * 4,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#66ccff",
    outlineWidth: 5,
    depth: 2,
    position: V2(594.980, 63.640),
    width: 307.086
  }));

  s.add_entity(new ImageEnt(sprites["s22/image4"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new SlideInLerpAnimation("left", islm),
    activateDelay: iads * 5,
    hoverAnimation: new EnlargeLerpAnimation(undefined, ihsm, ielm),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, ielm),
    shadowDraw: true,
    outlineColor: "#00b0f0",
    outlineWidth: 5,
    depth: 2,
    position: V2(89.904, 427.295),
    width: 352.543
  }));
  }

  // slide 23
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

  s.add_background(new SolidBackground("#ffffff"));
  

  s.add_entity(new ImageEnt(sprites["s23/title"], s, {
    lockImageRatio: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(0, -250),
    width: 328.570
  }));

  s.add_entity(new ImageEnt(sprites["s23/image1"], s, {
    lockImageRatio: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: iads * 1,
    depth: -1,
    position: V2(0, 30),
    width: 920
  }));
  }

  // slide 24
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

  s.add_background(new SolidBackground("#ffffff"));
  

  s.add_entity(new ImageEnt(sprites["s24/title"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("up", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: iads * 0,
    position: V2(457.172, 119.365),
    width: 105.579
  }));

  let textPopOffset = iads * 1;
  let textPopWindow = 240;

  let texts = [
    [135.743, 191.339, 119.522],
    [294.525, 191.350, 121.357],
    [453.811, 191.350, 114.795],
    [604.516, 187.393, 167.543],
    [807.293, 190.690, 53.662],
    [135.669, 225.636, 127.529],
    [300.963, 225.792, 83.037],
    [414.606, 226.088, 68.389],
    [517.389, 224.782, 82.998],
    [632.778, 225.540, 90.928],
    [756.774, 226.045, 122.568],
    [157.459, 258.622, 108.311],
    [303.944, 258.370, 131.787],
    [472.639, 257.865, 88.467],
    [598.656, 257.612, 128.779],
    [763.816, 257.612, 93.350],
    [135.753, 299.324, 30.566],
    [196.254, 294.578, 128.965],
    [359.821, 298.493, 126.982],
    [521.509, 298.493, 107.217],
    [661.152, 298.493, 60.068],
    [754.480, 298.271, 125.225],
    [155.459, 340.687, 93.662],
    [286.022, 340.445, 110.967],
    [431.755, 336.409, 78.855],
    [545.917, 339.940, 142.881],
    [726.229, 340.445, 132.959],
    [136.300, 382.871, 86.904],
    [274.691, 383.881, 95.381],
    [420.658, 382.366, 85.420],
    [557.029, 382.871, 88.662],
    [694.448, 379.340, 158.496],
    [135.119, 417.065, 132.803],
    [331.099, 417.422, 115.772],
    [510.741, 418.136, 146.436],
    [721.099, 417.422, 125.225],
    [133.956, 457.065, 146.787],
    [318.599, 457.065, 87.295],
    [438.429, 453.621, 135.387],
    [605.669, 457.065, 90.576],
    [734.393, 457.524, 125.381],
    [136.893, 491.810, 85.147],
    [274.393, 492.167, 122.100],
    [448.950, 492.065, 88.662],
    [587.965, 492.167, 111.162],
    [749.750, 492.167, 100.107],
    [134.750, 524.394, 88.662],
    [271.536, 524.310, 91.475],
    [410.822, 524.310, 132.061],
    [591.179, 524.310, 112.256],
    [752.250, 524.667, 100.147],
    [134.393, 556.096, 96.123],
    [263.322, 556.453, 86.279],
    [383.322, 556.453, 74.912],
    [489.393, 556.810, 84.482],
  ]

  let bullets = [
    [269.375, 194.822], [430.089, 194.554], [579.197, 195.089], [784.911, 195.268], [871.875, 194.911],
    [277.723, 228.731], [394.038, 228.940], [494.375, 228.839], [610.982, 229.018], [734.732, 229.018],
    [134.281, 263.318], [278.661, 261.875], [449.018, 261.518], [573.304, 261.875], [740.089, 261.875], [871.875, 261.875],
    [173.661, 301.875], [337.947, 301.518], [499.732, 301.875], [641.875, 301.161], [732.589, 301.875],
    [133.661, 344.018], [264.018, 344.018], [409.732, 344.732], [522.589, 344.018], [700.089, 344.732], [870.804, 345.089],
    [244.375, 387.232], [390.089, 386.518], [527.589, 386.875], [664.732, 386.518], [871.161, 387.232],
    [294.018, 421.161], [472.232, 421.518], [682.589, 420.804], [871.518, 421.161],
    [294.018, 461.161], [416.161, 460.804], [581.518, 460.804], [709.375, 461.518], [871.875, 460.804],
    [242.947, 495.089], [417.232, 495.089], [557.232, 494.732], [719.732, 495.089], [871.518, 495.447],
    [243.304, 528.304], [382.589, 528.304], [562.232, 528.661], [722.232, 527.947], [871.518, 527.947],
    [242.232, 560.447], [360.089, 560.089], [469.375, 560.089],

  ]

  for (let i = 0; i < texts.length; i++) {
    s.add_entity(new ImageEnt(sprites["s24/text" + (i + 1).toString()], s, {
      lockImageRatio: true,
      leftCornerPos: true,
      leftCanvasPos: true,
      activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
      activateDelay: textPopOffset + textPopWindow * Math.random(),
      position: V2(texts[i][0], texts[i][1]),
      width: texts[i][2]
    }));
  }

  for (let i = 0; i < bullets.length; i++) {
    s.add_entity(new ImageEnt(sprites["s24/circle"], s, {
      lockImageRatio: true,
      leftCornerPos: true,
      leftCanvasPos: true,
      activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
      activateDelay: textPopOffset + textPopWindow * Math.random(),
      position: V2(bullets[i][0], bullets[i][1]),
      width: 11.250
    }));
  }

  s.add_entity(new ImageEnt(sprites["s24/endtitle"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("down", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: textPopOffset + textPopWindow + iads * 1,
    position: V2(391.479, 596.371),
    width: 233.784
  }));

  s.add_entity(new ImageEnt(sprites["s24/endtext"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new CompoundAnimation([new SlideInLerpAnimation("down", tslm), new EnlargeLerpAnimation(0, 1, telm)]),
    activateDelay: textPopOffset + textPopWindow + iads * 2,
    position: V2(456.535, 645.938),
    width: 107.569
  }));

  s.add_entity(new ImageEnt(sprites["s24/heart1"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: textPopOffset + textPopWindow + iads * 3,
    position: V2(285.712, 602.841),
    width: 45.526
  }));

  s.add_entity(new ImageEnt(sprites["s24/heart2"], s, {
    lockImageRatio: true,
    leftCornerPos: true,
    leftCanvasPos: true,
    activateAnimation: new EnlargeLerpAnimation(0, 1, ielm),
    activateDelay: textPopOffset + textPopWindow + iads * 3.5,
    position: V2(649.962, 577.113),
    width: 53.886
  }));


  }
}

let sprites = {};

let toLoad = 0;

const assetPath = "dokumenty/prezentacia/2021/img/";

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
    "s11": ["title.png", "text1.png", "text2.png", "text3.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    "s12": ["title.png", "text1.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg", "image6.jpg", "image7.jpg"],
    "s13": ["title.png", "text1.png", "text2.png", "text3.png", "text4.png", "text5.png", "image1.png", "image2.jpg", "image3.jpg", "image4.jpg", "image5.png"],
    "s14": ["title.png", "text1.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    "s15": ["title.png", "text1.png", "text2.png", "text3.png", "text4.png", "text5.png", "text6.png", "text7.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg"],
    "s16": ["image1.jpg"],
    "s17": ["title.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg", "image6.jpg"],
    "s18": ["title.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    "s19": ["title.png", "text1.png", "text2.png", "text3.png", "text4.png", "text5.png", "text6.png", "text7.png", "text8.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg", "image6.jpg"],
    "s20": ["title.png", "text1.png", "text2.png", "text3.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg", "image6.jpg"],
    "s21": ["title.png", "text1.png", "text2.png", "text3.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    "s22": ["title.png", "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    "s23": ["title.png", "image1.jpg"],
    "s24": ["title.png", "endtitle.png", "endtext.png", "circle.png", "heart1.png", "heart2.png"],
  }

  for (let i = 1; i <= 55; i++) {
    S["s24"].push("text" + i.toString() + ".png");
  }

  for (slide of Object.keys(S)) {
    for (image of S[slide]) {
      toLoad++;
      //console.log(slide + "/" + image);
      let s = new Sprite([assetPath + "assets/" + slide + "/min/" + image, assetPath + "assets/" + slide + "/max/" + image]);
      s.upgrade(callback);
      sprites[slide + "/" + image.split(".")[0]] = s;
    }
  }

  toLoad++;
  sprites["arrow_icon"] = new Sprite([assetPath + "assets/arrow_icon.png"]);
  sprites["arrow_icon"].upgrade(callback, "max");

  toLoad++;
  sprites["menu_icon"] = new Sprite([assetPath + "assets/menu_icon.png"]);
  sprites["menu_icon"].upgrade(callback, "max");

  toLoad++;
  sprites["play_icon"] = new Sprite([assetPath + "assets/play_icon.png"]);
  sprites["play_icon"].upgrade(callback, "max");

  toLoad++;
  sprites["pause_icon"] = new Sprite([assetPath + "assets/pause_icon.png"]);
  sprites["pause_icon"].upgrade(callback, "max");


}

env.onload = () => {
  env.camera.position.y = 25;
  create_slides();
  activeslide = slides[0];
  activeslide.on_activate();

  let pause = () => {
    env.playing = false;
  }

  let play = () => {
    env.playing = true;
    env.play_timer = env.slide_duration;
  }

  let play_button = null;

  let barypos = canvas.height / 2 - 10;

  entities.push(
    new Button(sprites["arrow_icon"], {
      position: V2(-35 * 1.5, barypos),
      size: V2(30, 30),
      depth: 100,
      onPress: () => {
        prevslide();
        pause();
        play_button.set_state(0);
      },
      rotation: Math.PI * (1/2),
      hoverAnimation: new EnlargeLerpAnimation(undefined, 1.2, 0.3),
      unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, 0.3)
    })
  );

  entities.push(
    new Button(sprites["arrow_icon"], {
      position: V2(35 * 1.5, barypos),
      size: V2(30, 30),
      depth: 100,
      rotation: Math.PI * (3/2),
      onPress: () => {
        nextslide();
        pause();
        play_button.set_state(0);
      },
      hoverAnimation: new EnlargeLerpAnimation(undefined, 1.2, 0.3),
      unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, 0.3)
    })
  );

  entities.push(
    new Button(sprites["menu_icon"], {
      position: V2(-35/2, barypos),
      size: V2(30, 30),
      depth: 100,
      onPress: () => {
        switchslide(6 - 1);
        pause();
        play_button.set_state(0);
      },
      hoverAnimation: new EnlargeLerpAnimation(undefined, 1.2, 0.3),
      unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, 0.3)
    })
  );

  play_button = new ToggleButton(sprites["play_icon"], {
    position: V2(35/2, barypos),
    size: V2(30, 30),
    depth: 100,
    state: 1,
    sprites: [sprites["pause_icon"]],
    callbacks: [() => play(), () => pause()],
    hoverAnimation: new EnlargeLerpAnimation(undefined, 1.2, 0.3),
    unhoverAnimation: new EnlargeLerpAnimation(undefined, 1, 0.3)
  });
    
  entities.push(play_button);

};

function main() {
  canvas.addEventListener("mousedown", (event) => mouse_down(event));
  canvas.addEventListener("mouseup", (event) => mouse_up(event));
  canvas.addEventListener("mousemove", (event) => mouse_hover(event));

  sprites["gymvr_logo"].wait();
  
  preload_sprites(() => {
    toLoad--;
    if (toLoad <= 0) {
      env.loaded = true;
    }
  });

  env.loader = new Loader();


  env.tickInterval = setInterval(() => tick(), 1000 / env.tps);
  requestAnimationFrame(drawCallback);
}

sprites["gymvr_logo"] = new Sprite([assetPath + "assets/logo.png"]);
sprites["gymvr_logo"].upgrade();

window.onload = main;

}