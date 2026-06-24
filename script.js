let selectedChord = null;
const saveProjectBtn = document.getElementById("saveProjectBtn");
const loadProjectInput = document.getElementById("loadProjectInput");
const updateInfoBtn = document.getElementById("updateInfoBtn");
const leftInfo = document.getElementById("leftInfo");
const scoreTitle = document.getElementById("scoreTitle");
const rightInfo = document.getElementById("rightInfo");
const editor = document.getElementById("editor");
const lyricsInput = document.getElementById("lyricsInput");
const loadLyricsBtn = document.getElementById("loadLyrics");
const barBtn = document.getElementById("barBtn");
const toolbar =document.getElementById("toolbar");
console.log("JS 已載入");

if (!editor || !lyricsInput || !loadLyricsBtn || !barBtn) {

    console.error("HTML 元件沒有抓到，請檢查 id 是否一致");

}

let currentLine = null;

loadLyricsBtn.addEventListener("click",()=>{

    editor.innerHTML = "";

    const lyrics = lyricsInput.value;

    const lines = lyrics.split("\n");

    lines.forEach(lineText=>{

        const songLine = document.createElement("div");
        songLine.className = "song-line";

        const chordLayer = document.createElement("div");
        chordLayer.className = "chord-layer";

        const lyricLine = document.createElement("div");
        lyricLine.className = "lyric-line";
        lyricLine.contentEditable = "true";
        lyricLine.textContent = lineText;

        songLine.appendChild(chordLayer);
        songLine.appendChild(lyricLine);

        songLine.addEventListener("click",()=>{

            document
            .querySelectorAll(".song-line")
            .forEach(line=>{
                line.classList.remove("selected");

            });

            songLine.classList.add("selected");
            currentLine = songLine;

        });

        editor.appendChild(songLine);

        if(currentLine === null){
            currentLine = songLine;
            songLine.classList.add("selected");

        }

    });

});


function createChord(name,x,y){

    if(currentLine === null){
        alert("請先載入歌詞，並點選要放和弦的那一行");
        return;

    }

    const chordLayer =
    currentLine.querySelector(".chord-layer");

    const chord =
    document.createElement("div");

    chord.className = "chord";
    chord.textContent = name;

    chord.style.left = x + "px";
    chord.style.top = "0px";

    chord.addEventListener("dblclick",()=>{
        chord.remove();

    });

    chordLayer.appendChild(chord);

    makeDraggable(chord);

}

function makeDraggable(element){

    let offsetX;

    element.addEventListener("mousedown",(e)=>{

        offsetX = e.offsetX;

        function move(ev){

            const layer =
            element.parentElement;

            const rect =
            layer.getBoundingClientRect();

            let newX =
            ev.clientX - rect.left - offsetX;

            if(newX < 0){
                newX = 0;

            }

            element.style.left = newX + "px";
            element.style.top = "0px";

        }

        function stop(){

            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", stop);

        }

        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", stop);

    });

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

    if(currentLine === null){
        alert("請先點選要放小節線的那一行");
        return;

    }

    const chordLayer =
    currentLine.querySelector(".chord-layer");

    const bar =
    document.createElement("div");

    bar.className = "barline";
    bar.innerText = "|";

    bar.style.left = "100px";
    bar.style.top = "0px";

    bar.addEventListener("dblclick",()=>{
        bar.remove();

    });

    chordLayer.appendChild(bar);

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
updateInfoBtn.addEventListener("click",()=>{

    const title = document.getElementById("title").value;
    const artist = document.getElementById("artist").value;
    const lyricist = document.getElementById("lyricist").value;
    const composer = document.getElementById("composer").value;
    const key = document.getElementById("key").value;
    const maleKey = document.getElementById("maleKey").value;
    const femaleKey = document.getElementById("femaleKey").value;

    leftInfo.innerHTML =
    `演唱：${artist}<br>詞：${lyricist}<br>曲：${composer}`;

    scoreTitle.textContent = title;

    rightInfo.innerHTML =
    `原調：${key}<br>男調：${maleKey}<br>女調：${femaleKey}`;
});
saveProjectBtn.addEventListener("click",()=>{

    const data = {
        title: document.getElementById("title").value,
        artist: document.getElementById("artist").value,
        lyricist: document.getElementById("lyricist").value,
        composer: document.getElementById("composer").value,
        key: document.getElementById("key").value,
        maleKey: document.getElementById("maleKey").value,
        femaleKey: document.getElementById("femaleKey").value,
        editorHTML: editor.innerHTML,
        headerHTML: {
            leftInfo: leftInfo.innerHTML,
            scoreTitle: scoreTitle.textContent,
            rightInfo: rightInfo.innerHTML
        }
    };

    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        {type:"application/json"}
    );

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "chord-score.json";
    a.click();

    URL.revokeObjectURL(a.href);
});
loadProjectInput.addEventListener("change",(event)=>{

    const file = event.target.files[0];

    if(!file) return;

    const reader = new FileReader();

    reader.onload = ()=>{

        const data = JSON.parse(reader.result);

        document.getElementById("title").value = data.title || "";
        document.getElementById("artist").value = data.artist || "";
        document.getElementById("lyricist").value = data.lyricist || "";
        document.getElementById("composer").value = data.composer || "";
        document.getElementById("key").value = data.key || "";
        document.getElementById("maleKey").value = data.maleKey || "";
        document.getElementById("femaleKey").value = data.femaleKey || "";

        editor.innerHTML = data.editorHTML || "";

        leftInfo.innerHTML = data.headerHTML?.leftInfo || "";
        scoreTitle.textContent = data.headerHTML?.scoreTitle || "";
        rightInfo.innerHTML = data.headerHTML?.rightInfo || "";

        restoreEditorEvents();
    };

    reader.readAsText(file);
});
function restoreEditorEvents(){

    document
    .querySelectorAll(".song-line")
    .forEach(songLine=>{

        songLine.addEventListener("click",()=>{

            document
            .querySelectorAll(".song-line")
            .forEach(line=>{
                line.classList.remove("selected");
            });

            songLine.classList.add("selected");
            currentLine = songLine;
        });
    });

    document
    .querySelectorAll(".chord, .barline")
    .forEach(item=>{

        item.addEventListener("dblclick",()=>{
            item.remove();
        });

        makeDraggable(item);
    });
}
document.querySelectorAll(".sectionBtn").forEach(btn=>{

    btn.addEventListener("click",()=>{

        const songLine = document.createElement("div");
        songLine.className = "song-line";

        const chordLayer = document.createElement("div");
        chordLayer.className = "chord-layer";

        const lyricLine = document.createElement("div");
        lyricLine.className = "lyric-line section-line";
        lyricLine.contentEditable = "true";

        if(btn.innerText === "空白行"){
            lyricLine.textContent = "";
        }else{
            lyricLine.textContent = btn.innerText;
        }

        songLine.appendChild(chordLayer);
        songLine.appendChild(lyricLine);

        songLine.addEventListener("click",()=>{

            document.querySelectorAll(".song-line").forEach(line=>{
                line.classList.remove("selected");
            });

            songLine.classList.add("selected");
            currentLine = songLine;
        });

        if(currentLine){
            currentLine.after(songLine);
        }else{
            editor.appendChild(songLine);
        }

        currentLine = songLine;
        songLine.classList.add("selected");
    });
});
const applyStyleBtn = document.getElementById("applyStyleBtn");

applyStyleBtn.addEventListener("click",()=>{

    const titleSize = document.getElementById("titleSize").value;
    const lyricSize = document.getElementById("lyricSize").value;
    const chordSize = document.getElementById("chordSize").value;

    const titleColor = document.getElementById("titleColor").value;
    const lyricColor = document.getElementById("lyricColor").value;
    const chordColor = document.getElementById("chordColor").value;

    scoreTitle.style.fontSize = titleSize + "px";
    scoreTitle.style.color = titleColor;

    document.querySelectorAll(".lyric-line").forEach(line=>{
        line.style.fontSize = lyricSize + "px";
        line.style.color = lyricColor;
    });

    document.querySelectorAll(".chord").forEach(chord=>{
        chord.style.fontSize = chordSize + "px";
        chord.style.color = chordColor;
    });
});