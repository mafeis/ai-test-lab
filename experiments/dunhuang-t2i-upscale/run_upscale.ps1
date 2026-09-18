# run_upscale.ps1 — SeedVR2 7B 2x upscale for the two dunhuang images
$ErrorActionPreference = 'Continue'
$script:out = 'D:\mafei\deepseek-workspace\blender\dunhuang_test'
$script:tpl = 'D:\mafei\deepseek-workspace\blender\_drafts'

function Submit-Wait([object]$wf, [string]$name, [int]$timeout = 3600) {
    $body = @{ prompt = $wf; client_id = 'upscale' } | ConvertTo-Json -Depth 10
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8188/prompt" -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -ContentType 'application/json' -TimeoutSec 60
        $pids = $resp.prompt_id
        Write-Output "$name submitted: $pids"
    } catch {
        Write-Output "$name submit_error: $($_.Exception.Message)"
        return
    }
    $t0 = Get-Date
    while (((Get-Date) - $t0).TotalSeconds -lt $timeout) {
        Start-Sleep -Seconds 10
        $h2 = Invoke-RestMethod -Uri "http://127.0.0.1:8188/history/$pids" -TimeoutSec 30
        if ($h2.PSObject.Properties.Name -contains $pids) {
            $e = $h2.$pids
            $el = [math]::Round(((Get-Date) - $t0).TotalSeconds, 1)
            if ($e.status.status_str -eq 'error') {
                Write-Output "$name ERROR ${el}s"
                $e.status.messages | ConvertTo-Json -Depth 5 | Write-Output
            } else {
                $fl = ''
                foreach ($no in $e.outputs.PSObject.Properties) {
                    foreach ($v in $no.Value.PSObject.Properties) {
                        if ($v.Value -is [array]) { foreach ($img in $v.Value) { if ($img.filename) { $fl = "$($img.subfolder)/$($img.filename)" } } }
                    }
                }
                Write-Output "$name ok ${el}s -> $fl"
                return $fl
            }
            return
        }
    }
    Write-Output "$name TIMEOUT"
}

# upload source images into ComfyUI input
foreach ($f in @('dunhuang_flux2.png','dunhuang_zimg.png')) {
    & curl.exe -s -F "image=@$script:out\$f;filename=$f" -F overwrite=true "http://127.0.0.1:8188/upload/image"
    Write-Output ""
}

foreach ($case in @(@{src='dunhuang_flux2.png'; out='upscale/dunhuang_flux2_2x'}, @{src='dunhuang_zimg.png'; out='upscale/dunhuang_zimg_2x'})) {
    $wf = @{
        '1' = @{ class_type = 'LoadImage'; inputs = @{ image = $case.src } }
        '2' = @{ class_type = 'ImageScaleBy'; inputs = @{ image = @('1',0); upscale_method = 'lanczos'; scale_by = 2.0 } }
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
    $name = $case.src -replace 'dunhuang_','' -replace '.png',''
    $fl = Submit-Wait $wf "upscale-$name"
    if ($fl) {
        $fn = ($fl -replace '^.*/','')
        $sf = ($fl -replace '/[^/]*$','')
        Invoke-WebRequest -Uri "http://127.0.0.1:8188/view?filename=$([uri]::EscapeDataString($fn))&subfolder=$sf&type=output" -OutFile "$script:out\${name}_2x.png" -TimeoutSec 300
        Write-Output "downloaded $script:out\${name}_2x.png"
    }
}
Get-ChildItem $script:out | Select-Object Name, Length
Write-Output "UPSCALE DONE"
