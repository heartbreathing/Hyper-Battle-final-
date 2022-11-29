import { c, env, renderQueue, playSound } from '../game.js'
import { Sprite } from './sprite.js'

export class AttackBox extends Sprite {
    constructor(player, {
        position = { ...player.position },
        velocity = { x: 3, y: 0 },
        isShooting,
        duration = 3000, //duration only applies for shooting attacks
        cooldown = 0,
        width = 150,
        height = 60,
        color = 'green',
        damage = 50,
        knockback = { x: 1, y: 0 },
        api

    }) {
        //Note that velocity IS NOT PASSED and is only applied when shooting
        super({ position, color });

        this.player = player; //Which player does the attack belong to?

        this.attackVelocity = velocity;

        this.width = width;
        this.height = height;

        this.damage = damage;
        this.knockback = knockback;
        this.isShooting = isShooting;
        this.cooldown = cooldown;
        this.duration = duration;

        if (this.isShooting) {
            this.animationName = 'shotAttack';
        } else {
            this.animationName = 'attack'
        }


        this.api = api;
        if (api) {
            this.image = new Image();
            this.isImage = true;

        }

        if (env.displayAttackBoxes) {
            renderQueue.push(this);
        }
    }

    //ATTACKBOX DIMENSIONS
    get width() {
        if (this.activeSprite) {
            return this.image.width * this.activeSprite.scale;
        }
        return this._width
    }

    set width(width) {
        this._width = width;
    }

    get height() {
        if (this.activeSprite) {
            return this.image.height * this.activeSprite.scale;
        }
        return this._height
    }

    set height(height) {
        this._height = height;
    }



    get renderIndex() {
        return renderQueue.indexOf(this);

    }

    attack() {
        if (this.isOnCooldown) return;

        this.player.playAnimation(this.player.spriteSet[this.animationName + this.player.lastDirection],
            {
                playOnce: true,
                forceFullAnimation: true,
                callback: () => {
                    this.player.isAttacking = false;
                }
            });

        this.player.isAttacking = true;

        this.isOnCooldown = true;

        setTimeout(() => {
            this.isOnCooldown = false;
        }, this.cooldown);



        this.position = { ...this.player.position }; //Copy object without syncing them


        if (this.player.lastDirection === 'Left') {
            this.position.x = this.position.x - this.width / 2;
        }


        //SHOOT ATTACKS
        if (this.isShooting) {

            if (this.currentlyShooting) return;

            this.currentlyShooting = true;


            this.velocity = { ...this.attackVelocity };

            if (this.player.lastDirection === 'Left') {
                this.velocity.x = -this.velocity.x;

            }

            renderQueue.push(this) - 1;

            this.shootingTimeout = setTimeout(() => {

                this.velocity = { x: 0, y: 0 };

                renderQueue.splice(this.renderIndex, 1);

                this.currentlyShooting = false;

            }, this.duration);

            //if there's an api - fetch image
            if (this.api) {
                fetch(this.api)
                    .then((response) => response.json())
                    .then((data) => {

                        this.image.src = data.url;

                        this.playAnimation({
                            source: data.url,
                            offset: { x: 0, y: 0 },
                            scale: .1,
                            frames: 1
                        });
                    });
            }
        }

        //NORMAL (MELEE) ATTACKS
        else {

            playSound('punch');

            if (isColliding(this, this.player.enemy)) {
                this.player.enemy.takeDamage(this.damage, this.knockback)
            }
        }
    }

    removeShot() {
        this.currentlyShooting = false;
        this.velocity = { x: 0, y: 0 };
        renderQueue.splice(this.renderIndex, 1);
    }

    update() {
        super.update();


        //SHOT LANDING
        if (this.currentlyShooting && isColliding(this, this.player.enemy)) {

            this.removeShot()

            clearTimeout(this.shootingTimeout);
            this.player.enemy.takeDamage(this.damage, this.knockback)

        }
    }

    draw() {
        // if (this.image.src) debugger;
        super.draw(); //calling draw function of parent class (Sprite)
        if (env.displayAttackBoxes) {
            c.fillStyle = this.color;
            c.fillRect(this.position.x, this.position.y, this.width, this.height);
        }
    }
}


//COLLISION CHECKING
export function isColliding(rect1, rect2) {

    rect1.sides = getSides(rect1);
    rect2.sides = getSides(rect2);

    function getSides(rect) {

        const sides = {
            left: rect.position.x,
            top: rect.position.y,
            right: rect.position.x + rect.width,
            bottom: rect.position.y + rect.height
        };

        return sides;
    }

    if (
        rect1.sides.left < rect2.sides.right &&
        rect1.sides.right > rect2.sides.left &&
        rect1.sides.top < rect2.sides.bottom &&
        rect1.sides.bottom > rect2.sides.top
    ) {
        return true;
    }
    return false;
}

