const seeds = [
];

const run = async () => {
    seeds.forEach( (element) => {
        element.run();
    });
}

run();