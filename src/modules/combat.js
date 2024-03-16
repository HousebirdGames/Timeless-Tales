/*Timeless Tales is a retro text adventure created and published by Felix T. Vogel in 2023*/

import { roundToHalf } from "../main.js?v=2.0.6";

export default class Combat {
    constructor(player, enemy, appendToLog) {
        this.player = player;
        this.enemy = enemy;
        this.appendToLog = appendToLog;
    }

    async playerAttack() {
        const isCrit = Math.random() < 0.3;
        const damageModifier = isCrit ? 2 : 1;
        const rawDamage = this.player.attack;
        const defenseMultiplier = 1 - (this.enemy.defense / 100);

        const minDamage = Math.max(1, roundToHalf(rawDamage * 0.1));
        let damage = Math.max(minDamage, roundToHalf(rawDamage * defenseMultiplier)) * damageModifier;

        if (isCrit) {
            await this.appendToLog(`You've struck a powerful critical hit!`);
        } else if (Math.random() < 0.05) {
            damage = 0;
            await this.appendToLog(`Your attack missed!`);
        }

        this.enemy.health -= damage;
        this.enemy.health = roundToHalf(Math.max(0, this.enemy.health));
        return damage;
    }

    async enemyAttack() {
        const isCrit = Math.random() < 0.1;

        const damageModifier = isCrit ? 1.5 : 1;
        const rawDamage = this.enemy.attack;
        const defenseMultiplier = 1 - (this.player.defense / 100);
        const minDamage = Math.max(1, roundToHalf(rawDamage * 0.1));
        let damage = Math.max(minDamage, roundToHalf(rawDamage * defenseMultiplier)) * damageModifier;

        if (Math.random() < 0.1 || (this.player.health <= damage && Math.random() < 0.25)) {
            damage = 0
            await this.appendToLog(`The enemies attack missed!`);
        }
        else if (isCrit) {
            await this.appendToLog(`The ${this.enemy.name} landed a critical hit on you!`);
        }
        this.player.health -= damage;
        this.player.health = roundToHalf(Math.max(0, this.player.health));
        return damage;
    }

    isPlayerDead() {
        return this.player.health <= 0;
    }

    isEnemyDead() {
        return this.enemy.health <= 0;
    }
}
