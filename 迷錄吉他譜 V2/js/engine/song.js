// Melo Engine v1
// 歌曲資料模型

const Song = {

    title: "歌曲名稱",

    key: "C",

    capo: 0,

    tempo: 80,

    blocks: [

        {
            type: "section",
            text: "[前奏]"
        },

        {
            type: "line",

            chords: [
                "C",
                "G",
                "Am",
                "F"
            ],

            lyrics: "在這裡輸入歌詞，和弦會固定在上方"
        },

        {
            type: "line",

            chords: [
                "C",
                "G"
            ],

            lyrics: "點擊這一行即可編輯"
        }

    ]

};