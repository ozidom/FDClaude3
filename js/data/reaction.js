/**
 * TABLE 12 (Reaction). Roll 2d6 + CHA modifier (rule 49).
 */
FD.Data.Reaction = [
    { max: 2, id: 'attack', name: 'Immediate attack', text: 'Monsters advance and attack immediately when able.' },
    { max: 5, id: 'hostile', name: 'Hostile', text: 'Monsters threaten, refuse cooperation or may attack. You can still react.' },
    { max: 8, id: 'uncertain', name: 'Uncertain', text: 'Monsters hesitate. Parley, bribes or another Reaction roll may decide it.' },
    { max: 11, id: 'talkative', name: 'Talkative / favourable', text: 'Monsters do not attack and may bargain or exchange information.' },
    { max: 999, id: 'friendly', name: 'Friendly / helpful', text: 'Monsters may assist, give information, allow passage or ally.' }
];

/**
 * Looks up a Reaction row for a modified 2d6 total.
 * @param {number} total  Modified roll.
 * @returns {{max:number, id:string, name:string, text:string}}
 */
FD.Data.reactionFor = function (total) {
    for (const row of FD.Data.Reaction) {
        if (total <= row.max) {
            return row;
        }
    }
    return FD.Data.Reaction[FD.Data.Reaction.length - 1];
};

/**
 * Finds a Reaction row by id.
 * @param {string} id  Reaction id.
 * @returns {Object}
 */
FD.Data.reactionById = function (id) {
    for (const row of FD.Data.Reaction) {
        if (row.id === id) {
            return row;
        }
    }
    return FD.Data.Reaction[2];
};
