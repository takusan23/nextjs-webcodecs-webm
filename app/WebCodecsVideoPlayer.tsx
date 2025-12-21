'use client'

import { useRef } from "react"

export default function WebCodecsVideoPlayer() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    /** 再生を始める */
    async function startVideoPlay(file?: File) {
if (!file) return
if (!canvasRef.current) return

// Kotlin Multiplatform で出来たライブラリをロード
// 絶対クライアントが良いので動的ロードする
const {
    parseWebm,
    getVideoHeightFromWebmParseResult,
    getVideoWidthFromWebmParseResult,
    getVideoEncodeDataFromWebmParseResult,
    getTimeFromEncodeData,
    getEncodeDataFromEncodeData,
    isKeyFrameFromEncodeData
} = await import("himari-webm-kotlin-multiplatform")

// WebM をパース
const arrayBuffer = await file.arrayBuffer()
const intArray = new Int8Array(arrayBuffer)
const parseRef = parseWebm(intArray as any)

        // 動画の縦横サイズを出す
        const videoHeight = Number(getVideoHeightFromWebmParseResult(parseRef))
        const videoWidth = Number(getVideoWidthFromWebmParseResult(parseRef))

        // 映像トラックのエンコード済みデータの配列
        // TODO 全部メモリに乗せることになってる
        const videoTrackEncodeDataList = Array.from(getVideoEncodeDataFromWebmParseResult(parseRef) as any).map((ref) => ({
            time: getTimeFromEncodeData(ref),
            encodeData: getEncodeDataFromEncodeData(ref),
            isKeyFrame: isKeyFrameFromEncodeData(ref)
        }))

        // とりあえず Canvas に書く
        const ctx = canvasRef.current.getContext('2d')

        // WebCodecs をいい感じに Promise にする
        let outputCallback: ((videoFrame: VideoFrame) => void) = () => { }

        // outputCallback() 呼び出しまで待機する Promise
        function awaitVideoFrameOutput() {
            return new Promise<VideoFrame>((resolve) => {
                outputCallback = (videoFrame) => {
                    resolve(videoFrame)
                }
            })
        }

        // WebCodecs インスタンスを作成
        const videoDecoder = new VideoDecoder({
            error: (err) => {
                alert('WebCodecs API でエラーが発生しました')
            },
            output: (videoFrame) => {
                outputCallback(videoFrame)
            }
        })

        // セットアップ
        videoDecoder.configure({
            codec: 'vp09.00.10.08', // コーデックは VP9 固定にする...
            codedHeight: videoHeight,
            codedWidth: videoWidth
        })

        // 開始時間を控えておく
        const startTime = Date.now()

        // 映像トラックのエンコード済みデータを得る
        for (const encodeData of videoTrackEncodeDataList) {

            // 順番にデコーダーに入れていく
            const videoChunk = new EncodedVideoChunk({
                data: new Int8Array(encodeData.encodeData as any).buffer as any,
                timestamp: Number(encodeData.time) * 1_000,
                type: encodeData.isKeyFrame ? 'key' : 'delta'
            })

            // デコーダーに入れる
            const outputPromise = awaitVideoFrameOutput()
            videoDecoder.decode(videoChunk)

            // output = () => { } が呼び出されるのを待つ
            const videoFrame = await outputPromise

            // Canvas にかく
            ctx?.drawImage(videoFrame, 0, 0, canvasRef.current.width, canvasRef.current.height)
            videoFrame.close()

            // 次のループに進む前に delay を入れる。30fps なら 33ms は待つ必要があるので
            // タイムスタンプと再生開始時間を足した時間が、今のフレームを出し続ける時間
            const delayMs = (startTime + (videoFrame.timestamp / 1_000)) - Date.now()
            await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
    }

    return (
        <div className="flex flex-col space-y-2 border rounded-md border-l-blue-600 p-4 items-start">

            <h2 className="text-2xl text-blue-600">
                WebCodecs で動画再生
            </h2>

            <canvas
                ref={canvasRef}
                width={640}
                height={360} />

            <input
                className="p-1 border rounded-md border-l-blue-600"
                accept="video/webm"
                type="file"
                onChange={(ev) => startVideoPlay(ev.currentTarget.files?.[0])} />
        </div>
    )
}