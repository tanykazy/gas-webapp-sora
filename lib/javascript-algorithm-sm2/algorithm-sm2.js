// algorithm SM-2
// http://super-memory.com/english/ol/sm2.htm
//
// input:
// user grade q
// 5 - perfect response
// 4 - correct response after a hesitation
// 3 - correct response recalled with serious difficulty
// 2 - incorrect response; where the correct one seemed easy to recall
// 1 - incorrect response; the correct one remembered
// 0 - complete blackout.
//
// repetition number n
// easiness factor EF
// interval I

// output:
//      updated values of n, EF, I


/**
 * calculate inter-repetition intervals
 * @param {number} n - the n-th repetition (in days)
 * @param {number} ef - E-Factor of a given item
 * @returns {number} inter-repetition intervals
 */
function calculateIntervals(n, ef) {
    if (n === 1) {
        return 1;
    } else if (n === 2) {
        return 6;
    } else if (n > 2) {
        return Math.ceil((n - 1) * ef);
    }
}

/**
 * function used in calculating EF'.
 * @param {number} ef - old value of the E-Factor
 * @param {number} q - quality of the response
 * @returns {number} new value of the E-Factor
 */
function calculateEF(ef, q) {
    return ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
}

/**
 * @param {number} q - quality of the response in the 0-5 grade scale.
 * 5 - perfect response
 * 4 - correct response after a hesitation
 * 3 - correct response recalled with serious difficulty
 * 2 - incorrect response; where the correct one seemed easy to recall
 * 1 - incorrect response; the correct one remembered
 * 0 - complete blackout.
 * @param {object} properties - tracked properties of item
 * @param {number} properties.n - the n-th repetition (in days)
 * @param {number} properties.ef - E-Factor of a given item
 * @param {number} properties.i - inter-repetition interval after the n-th repetition (in days)
 * @returns {object} tracked properties of item
 */
function algorithmSM2(q, properties) {
    properties.i = calculateIntervals(properties.n, properties.ef);

    properties.ef = calculateEF(properties.ef, q);

    if (properties.ef < 1.3) {
        properties.ef = 1.3;
    }

    if (q < 3) {
        properties.i = calculateIntervals(1, properties.ef);
    }

    return properties;
}
