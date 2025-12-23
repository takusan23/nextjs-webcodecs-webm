import ReverseVideoMaker from "./ReverseVideoMaker";
import WebCodecsVideoPlayer from "./WebCodecsVideoPlayer";

export default function Home() {
  return (
    <div className="flex flex-col p-2 space-y-2">
      <h1 className="text-4xl">WebCodecs + WebM サイト</h1>

      <WebCodecsVideoPlayer />
      <ReverseVideoMaker />
    </div>
  )
}
