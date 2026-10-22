import math
import shutil
import numpy as np
import imageio

def generate_quietcue_video(output_path, duration_sec=6, fps=30, width=1280, height=720):
    total_frames = duration_sec * fps
    writer = imageio.get_writer(output_path, fps=fps, codec='libx264', quality=8, pixelformat='yuv420p')

    # Precompute static coordinates and background glow matrices
    y_coords, x_coords = np.ogrid[:height, :width]
    
    # Static center glow
    cx1, cy1 = width * 0.5, height * 0.65
    dist1 = np.sqrt((x_coords - cx1)**2 + (y_coords - cy1)**2)
    static_glow1 = np.clip(1.0 - dist1 / (height * 0.75), 0.0, 1.0) ** 2.2
    
    # Static amber hearth glow on right
    cx2, cy2 = width * 0.82, height * 0.80
    dist2 = np.sqrt((x_coords - cx2)**2 + (y_coords - cy2)**2)
    static_glow2 = np.clip(1.0 - dist2 / (height * 0.55), 0.0, 1.0) ** 2.5

    # Particles definition
    num_particles = 36
    np.random.seed(42)
    p_x = np.random.uniform(60, width - 60, num_particles)
    p_y = np.random.uniform(60, height - 60, num_particles)
    p_speed = np.random.uniform(0.6, 1.4, num_particles)
    p_radius = np.random.uniform(3.0, 7.0, num_particles)
    p_color_type = np.random.choice(['cyan', 'blue', 'amber'], num_particles, p=[0.55, 0.30, 0.15])
    p_phase = np.random.uniform(0, math.pi * 2, num_particles)

    print(f"Generating {total_frames} frames for {output_path}...")

    # Pre-allocate base frame arrays
    for f in range(total_frames):
        loop_angle = (f / total_frames) * math.pi * 2
        breath = 0.82 + 0.18 * math.sin(loop_angle)

        # Base background color: Deep midnight obsidian slate
        frame_r = np.full((height, width), 7.0, dtype=np.float32)
        frame_g = np.full((height, width), 12.0, dtype=np.float32)
        frame_b = np.full((height, width), 24.0, dtype=np.float32)

        # Apply precomputed glows
        frame_r += static_glow1 * 14.0 * breath
        frame_g += static_glow1 * 38.0 * breath
        frame_b += static_glow1 * 72.0 * breath

        amber_pulse = 0.8 + 0.2 * math.sin(loop_angle * 2.0)
        frame_r += static_glow2 * 32.0 * amber_pulse
        frame_g += static_glow2 * 16.0 * amber_pulse
        frame_b += static_glow2 * 4.0

        # Harmonious acoustic waveforms
        for color, amp, freq, speed, base_y, thickness in [
            ((2, 132, 199), 34.0, 0.0035, 1.0, height * 0.54, 4.0),
            ((56, 189, 248), 26.0, 0.0050, 1.3, height * 0.52, 3.2),
            ((0, 229, 255), 19.0, 0.0075, 1.8, height * 0.50, 2.8),
            ((245, 158, 11), 13.0, 0.0060, -1.1, height * 0.56, 2.2),
        ]:
            phase = loop_angle * speed
            wave_y = base_y + amp * np.sin(x_coords * freq + phase) + (amp * 0.5) * np.sin(x_coords * freq * 1.8 - phase * 0.7)
            dist_to_wave = np.abs(y_coords - wave_y)
            wave_mask = np.clip(1.0 - dist_to_wave / (thickness * 2.5), 0.0, 1.0) ** 1.8
            
            frame_r += wave_mask * color[0] * 0.88
            frame_g += wave_mask * color[1] * 0.88
            frame_b += wave_mask * color[2] * 0.88

        # Efficient local particle stamp rendering
        for p in range(num_particles):
            cur_x = int(p_x[p] + 28.0 * math.sin(loop_angle + p_phase[p]))
            cur_y = int(p_y[p] + 22.0 * math.cos(loop_angle * p_speed[p] + p_phase[p]))
            r_int = int(math.ceil(p_radius[p] * 2.2))

            y1 = max(0, cur_y - r_int)
            y2 = min(height, cur_y + r_int + 1)
            x1 = max(0, cur_x - r_int)
            x2 = min(width, cur_x + r_int + 1)

            if y2 > y1 and x2 > x1:
                sub_y, sub_x = np.ogrid[y1:y2, x1:x2]
                sub_dist = np.sqrt((sub_x - cur_x)**2 + (sub_y - cur_y)**2)
                p_mask = np.clip(1.0 - sub_dist / p_radius[p], 0.0, 1.0) ** 1.6

                if p_color_type[p] == 'cyan':
                    p_col = (0, 220, 255)
                elif p_color_type[p] == 'blue':
                    p_col = (56, 189, 248)
                else:
                    p_col = (251, 191, 36)

                frame_r[y1:y2, x1:x2] += p_mask * p_col[0] * 0.95
                frame_g[y1:y2, x1:x2] += p_mask * p_col[1] * 0.95
                frame_b[y1:y2, x1:x2] += p_mask * p_col[2] * 0.95

        # Render finished frame to video
        frame_rgb = np.clip(np.dstack([frame_r, frame_g, frame_b]), 0, 255).astype(np.uint8)
        writer.append_data(frame_rgb)

        if (f + 1) % 60 == 0:
            print(f"Rendered {f + 1}/{total_frames} frames...")

    writer.close()
    print(f"Successfully generated {output_path}!")

if __name__ == '__main__':
    out1 = r"c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\quietcue_ambient.mp4"
    out2 = r"c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\movie.mp4"
    out3 = r"c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\dist\movie.mp4"
    out4 = r"c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\sim_blackhole.mp4"
    out5 = r"c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\dist\sim_blackhole.mp4"

    generate_quietcue_video(out1, duration_sec=6, fps=30, width=1280, height=720)

    for dst in [out2, out3, out4, out5]:
        shutil.copyfile(out1, dst)
        print(f"Copied to {dst}")
