import subprocess
import os

SCENES = [
    {"id": "scene1", "audio": "assets/audio/scene1.mp3", "image": "assets/frames/scene1.png"},
    {"id": "scene2", "audio": "assets/audio/scene2.mp3", "image": "assets/frames/scene2.png"},
    {"id": "scene3", "audio": "assets/audio/scene3.mp3", "image": "assets/frames/scene3.png"},
    {"id": "scene4", "audio": "assets/audio/scene4.mp3", "image": "assets/frames/scene4.png"},
]

def render_scene_video(scene):
    out_mp4 = f"assets/video_{scene['id']}.mp4"
    # Get audio duration
    dur_cmd = f"ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 {scene['audio']}"
    dur = float(subprocess.check_output(dur_cmd, shell=True).decode().strip())
    # Add 0.5s padding
    dur += 0.5
    
    cmd = (
        f'ffmpeg -y -loop 1 -i "{scene["image"]}" -i "{scene["audio"]}" '
        f'-c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p '
        f'-t {dur} "{out_mp4}"'
    )
    print(f"Rendering {scene['id']} ({dur:.2f}s)...")
    subprocess.run(cmd, shell=True, check=True)
    return out_mp4

def concat_videos(video_list, final_out):
    concat_file = "assets/concat_list.txt"
    with open(concat_file, "w") as f:
        for v in video_list:
            # write absolute path or relative to cwd
            abs_v = os.path.abspath(v).replace("\\", "/")
            f.write(f"file '{abs_v}'\n")
            
    cmd = f'ffmpeg -y -f concat -safe 0 -i "{concat_file}" -c copy "{final_out}"'
    print(f"Concatenating into {final_out}...")
    subprocess.run(cmd, shell=True, check=True)
    print("Done rendering master video!")

if __name__ == "__main__":
    os.chdir("C:/Users/Administrator/Documents/binance-agent-mcp")
    v_files = []
    for s in SCENES:
        v_files.append(render_scene_video(s))
    concat_videos(v_files, "binance_agent_os_demo_official.mp4")
