// let body = document.getElementsByName('body')
let scene = document.getElementById('scene');
// boxLabel
let tt1 = document.getElementById('transitionText1')
// textLabel
let tt2 = document.getElementById('transitionText2')

let skipIntro 
// = true;

function wait(milliseconds){
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

async function navigateAfterTransition(event) {
    event.preventDefault();
    const destination = event.currentTarget.href;

    await transition(); // Your existing async function
    window.location.assign(destination);
}

async function transition() {
    if (!scene || skipIntro) {
        return;
    }

    document.body.style.overflow = "hidden";
    scene.className = "scene";
    scene.style.display = 'flex';
    tt1.innerText = "Moving";
    // tt1.className = "anim-transition";
    
    await wait(3000)
    tt1.className = "anim-transition";
    tt2.className = "anim-fadeOut";

    await wait(5500)
    // document.getElementsByClassName('intro-scene')[0].style.display = 'none';
    // tt1.style.display = 'none';
    // tt2.style.display = "none";
}
console.log(skipIntro);
async function showLoaded() {
    if (!scene || skipIntro) {
        scene.style.display = 'none';
        document.body.style.overflow = "auto";
        return;
    }
    
    document.body.style.overflow = "hidden";
    await wait(4500); // Wait for 4.5 second before showing the content
    scene.style.display = 'none';
    document.body.style.overflow = "auto";
}

window.addEventListener("DOMContentLoaded", () => {
    // The DOM is fully loaded, document.body is safe to use
    showLoaded();
});
