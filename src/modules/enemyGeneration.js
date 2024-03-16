/*Timeless Tales is a retro text adventure created and published by Felix T. Vogel in 2023*/

import { baseEnemies, enemiesModificators, enemiesRank, endbosses } from './gameData.js?v=2.0.6';
import { roundToHalf } from '../main.js?v=2.0.6';

export default class Enemy {
    constructor(name, health, attack, defense, weight) {
        this.name = name;
        this.health = health;
        this.attack = attack;
        this.defense = defense;
        this.weight = weight;
    }
}

export function generateEnemy(difficultyModificator = 1.4) {
    const baseEnemy = baseEnemies[Math.floor(Math.random() * baseEnemies.length)];

    let name = baseEnemy.name;
    let health = baseEnemy.health;
    let attack = baseEnemy.attack;
    let defense = baseEnemy.defense;
    let weight = baseEnemy.weight;

    const modifierIndex = Math.floor(Math.random() * enemiesModificators.length);
    const modifier = enemiesModificators[modifierIndex];
    if (Math.random() < modifier.chance) {
        name = modifier.verb + " " + name;
        health = roundToHalf(health * modifier.modificator);
        attack = roundToHalf(attack * modifier.modificator);
        defense = roundToHalf(defense * modifier.modificator);
        weight = roundToHalf(weight * modifier.modificator);
    }

    const rankIndex = Math.floor(Math.random() * enemiesRank.length);
    const rank = enemiesRank[rankIndex];
    if (Math.random() < rank.chance && baseEnemy.rank) {
        name += " " + rank.rank;
        health = roundToHalf(health * rank.modificator);
        attack = roundToHalf(attack * rank.modificator);
        defense = roundToHalf(defense * rank.modificator);
        weight = roundToHalf(weight * rank.modificator);
    }

    health = roundToHalf(health * difficultyModificator * 2);
    attack = roundToHalf(attack * difficultyModificator);
    defense = roundToHalf(defense * difficultyModificator);

    return new Enemy(name, health, attack, defense, weight);
}

export function calculateEnemyCombinations() {
    const numEnemyTypes = baseEnemies.length;
    const numEndbosses = endbosses.length;

    let totalCombinations = 0;

    baseEnemies.forEach(baseEnemy => {
        const modifierCombinations = enemiesModificators.length;
        const rankCombinations = baseEnemy.rank ? enemiesRank.length : 1;
        totalCombinations += modifierCombinations * rankCombinations;
    });

    return {
        numEnemyTypes: numEnemyTypes,
        totalCombinations: totalCombinations,
        numEndbosses: numEndbosses
    };
}