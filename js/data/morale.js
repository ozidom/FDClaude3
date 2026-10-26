/**
 * TABLE 13 (Morale). Roll 2d6; a result greater than the Morale score fails.
 */
FD.Data.Morale = {
    triggers: {
        firstCasualty: 'First monster casualty',
        halfDefeated: 'Half the group defeated',
        leaderKilled: 'Leader killed',
        terrifying: 'Terrifying magic/event'
    },
    outcomes: {
        flee: { name: 'Flee', board: 'Move tokens toward Enemy Rear and off the Clash Board.' },
        surrender: { name: 'Surrender', board: 'Stop attacking; leave tokens in position.' },
        bargain: { name: 'Bargain', board: 'Combat pauses and Reaction/Parley resumes.' }
    }
};
