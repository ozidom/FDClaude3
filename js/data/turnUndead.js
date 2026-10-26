/**
 * TABLE 10 (Turning Undead). Roll 2d6 >= the number shown.
 * 'T' = automatically turn, 'D' = automatically destroy, null = cannot turn.
 */
FD.Data.TurnUndead = {
    1: { skeleton: 7, zombie: 9, ghoul: 11, wight: null, wraith: null },
    2: { skeleton: 'T', zombie: 7, ghoul: 9, wight: 11, wraith: null },
    3: { skeleton: 'D', zombie: 'T', ghoul: 7, wight: 9, wraith: 11 }
};

/** TABLE 10 (Board Effect): HD of undead affected by a successful turn. */
FD.Data.TURN_HD_DICE = '2d6';
