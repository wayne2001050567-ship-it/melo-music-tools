let selectedChord = null;

const editor = document.getElementById("editor");
const lyricsInput = document.getElementById("lyricsInput");
const loadLyricsBtn = document.getElementById("loadLyrics");
const barBtn = document.getElementById("barBtn");
const toolbar =document.getElementById("toolbar");
console.log("JS 已載入");

if (!editor || !lyricsInput || !loadLyricsBtn || !barBtn) {

    console.error("HTML 元件沒有抓到，請檢查 id 是否一致");

}

loadLyricsBtn.addEventListener("click",()=>{

    editor.innerHTML = "";

    const lyrics = lyricsInput.value;

    const div = document.createElement("div");

    div.textContent = lyrics;

    div.contentEditable = "true";

    div.className = "lyricsText";

    editor.appendChild(div);

});


function createChord(name,x,y){

    const chord =
    document.createElement("div");

    chord.className = "chord";

    chord.textContent = name;

    chord.style.left =
    x + "px";

    chord.style.top =
    y + "px";

    editor.appendChild(chord);

    makeDraggable(chord);
}

function makeDraggable(element){

    let offsetX;
    let offsetY;

    element.addEventListener(
        "mousedown",
        (e)=>{

            offsetX =
            e.offsetX;

            offsetY =
            e.offsetY;

            function move(ev){

                const rect =
                editor.getBoundingClientRect();

                element.style.left =
                ev.clientX -
                rect.left -
                offsetX +
                "px";

                element.style.top =
                ev.clientY -
                rect.top -
                offsetY +
                "px";
            }

            function stop(){

                document.removeEventListener(
                    "mousemove",
                    move
                );

                document.removeEventListener(
                    "mouseup",
                    stop
                );
            }

            document.addEventListener(
                "mousemove",
                move
            );

            document.addEventListener(
                "mouseup",
                stop
            );
        }
    );
}
document
.querySelectorAll(".chordBtn")
.forEach(btn=>{

    btn.addEventListener("click",()=>{

        createChord(
            btn.innerText,
            50,
            50
        );

    });

});

barBtn.addEventListener("click",()=>{
    const bar =
    document.createElement("div");

    bar.className =
    "barline";
    bar.innerText = "|";

    bar.style.left = "100px";
    bar.style.top = "100px";

    editor.appendChild(bar);

    makeDraggable(bar);

});
const customChordInput =
document.getElementById("customChordInput");

const addCustomChordBtn =
document.getElementById("addCustomChordBtn");

addCustomChordBtn.addEventListener("click",()=>{

    const chordName =
    customChordInput.value.trim();

    if(chordName === ""){
        alert("請輸入和弦");
        return;
    }

    const btn =
    document.createElement("button");

    btn.className = "chordBtn";
    btn.innerText = chordName;

    btn.addEventListener("click",()=>{

        createChord(
            chordName,
            50,
            50
        );
    });

    const barBtn =
    document.getElementById("barBtn");

    toolbar.insertBefore(btn, barBtn);

    customChordInput.value = "";

});