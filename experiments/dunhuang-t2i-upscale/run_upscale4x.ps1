# run_upscale4x.ps1 — SeedVR2 7B 4x upscale for the two dunhuang original images
$ErrorActionPreference = 'Continue'
$script:out = 'D:\mafei\deepseek-workspace\blender\dunhuang_test'

function Submit-Wait([object]$wf, [string]$name, [int]$timeout = 7200) {
    $body = @{ prompt = $wf; client_id = 'upscale4x' } | ConvertTo-Json -Depth 10
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8188/prompt" -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -ContentType 'application/json' -TimeoutSec 60
        Write-Output "$name submitted: $($resp.prompt_id)"
        return $resp.prompt_id
    } catch {
        Write-Output "$name submit_error: $($_.Exception.Message)"
        return $null
    }
}

function Wait-History([string]$pids, [int]$timeout = 7200) {
    if (-not $pids) { return }
    $t0 = Get-Date
    while (((Get-Date) - $t0).TotalSeconds -lt $timeout) {
        Start-Sleep -Seconds 15
        $h2 = Invoke-RestMethod -Uri "http://127.0.0.1:8188/history/$pids" -TimeoutSec 30
        if ($h2.PSObject.Properties.Name -contains $pids) {
            $e = $h2.$pids
            $el = [math]::Round(((Get-Date) - $t0).TotalSeconds, 1)
            if ($e.status.status_str -eq 'error') {
                Write-Output "$pids ERROR ${el}s"
                $e.status.messages | ConvertTo-Json -Depth 5 | Write-Output
                return
            }
            foreach ($no in $e.outputs.PSObject.Properties) {
                foreach ($v in $no.Value.PSObject.Properties) {
                    if ($v.Value -is [array]) { foreach ($img in $v.Value) { if ($img.filename) { Write-Output "ok ${el}s -> $($img.subfolder)/$($img.filename)" } } }
                }
            }
            return
        }
    }
    Write-Output "$pids TIMEOUT"
}

foreach ($case in @(@{src='dunhuang_flux2.png'; out='upscale/dunhuang_flux2_4x'}, @{src='dunhuang_zimg.png'; out='upscale/dunhuang_zimg_4x'})) {
    $wf = @{
        '1' = @{ class_type = 'LoadImage'; inputs = @{ image = $case.src } }
        '2' = @{ class_type = 'ImageScaleBy'; inputs = @{ image = @('1',0); upscale_method = 'lanczos'; scale_by = 4.0 } }
        '3' = @{ class_type = 'SeedVR2Preprocess'; inputs = @{ resized_images = @('2',0) } }
        '4' = @{ class_type = 'VAELoader'; inputs = @{ vae_name = 'ema_vae_fp16.safetensors' } }
        '5' = @{ class_type = 'VAEEncodeTiled'; inputs = @{ pixels = @('3',0); vae = @('4',0); tile_size = 512; overlap = 128; temporal_size = 4096; temporal_overlap = 8 } }
        '6' = @{ class_type = 'UNETLoader'; inputs = @{ unet_name = 'seedvr2_ema_7b_fp8_e4m3fn.safetensors'; weight_dtype = 'default' } }
        '7' = @{ class_type = 'SeedVR2Conditioning'; inputs = @{ model = @('6',0); vae_conditioning = @('5',0) } }
        '8' = @{ class_type = 'KSampler'; inputs = @{ model = @('6',0); positive = @('7',0); negative = @('7',1); latent_image = @('5',0); seed = 91720260; steps = 1; cfg = 1; sampler_name = 'euler'; scheduler = 'simple'; denoise = 1 } }
        '9' = @{ class_type = 'VAEDecodeTiled'; inputs = @{ samples = @('8',0); vae = @('4',0); tile_size = 512; overlap = 128; temporal_size = 4096; temporal_overlap = 8 } }
        '10' = @{ class_type = 'SeedVR2PostProcessing'; inputs = @{ images = @('9',0); original_resized_images = @('2',0); color_correction_method = 'lab' } }
        '11' = @{ class_type = 'SaveImage'; inputs = @{ images = @('10',0); filename_prefix = $case.out } }
    }
    $pids = Submit-Wait $wf "4x-$($case.src)"
    Wait-History $pids
}
Write-Output "UPSCALE4X DONE"
