

/*
    Helper function for getting pluralized strings. 
*/

const plural = (string, num) => {

    if (num === 0 || num > 1)
        return string + "s";

    else 
        return string;

}

export default plural;