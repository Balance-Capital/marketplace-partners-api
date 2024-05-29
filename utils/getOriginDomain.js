
const getOriginDomain = (domain) => {
    if(!domain) return null;
    const atom = domain.split('.');
    let pureDomain;
    const index = atom.length-1;
    if(atom[index].length === 2) {
        if(atom[index-1].length === 3) {
            pureDomain = `${atom[index-2]}.${atom[index-1]}.${atom[index]}`;
            if(pureDomain.match(/undefined/)) {
                pureDomain = pureDomain.replace('undefined.','');
            }
        } else if(atom[index-1] === 'co') {
            pureDomain = `${atom[index-2]}.${atom[index-1]}.${atom[index]}`;
        } else {
            pureDomain = `${atom[index-1]}.${atom[index]}`;
        };
    };
    if(atom[index].length === 3) {
        if(atom[index-1].length === 2) {
            if(atom.length >= 3 ) {
                pureDomain = `${atom[index-2]}.${atom[index-1]}.${atom[index]}`;            
            } else {
                pureDomain = `${atom[index-1]}.${atom[index]}`;
            }
        } else {
            pureDomain = `${atom[index-1]}.${atom[index]}`;            
        };
    };
    if(atom[index].length === 4) {
        pureDomain = `${atom[index-1]}.${atom[index]}`;
    };
    return pureDomain && pureDomain.toLowerCase() || null;
};

module.exports = {
    getOriginDomain
};