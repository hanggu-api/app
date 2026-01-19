
async function test() {
    try {
        const response = await fetch('http://localhost:4011/api/services/ai/classify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: "quanto custa fazer a barba completa"
            })
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(error);
    }
}

test();
