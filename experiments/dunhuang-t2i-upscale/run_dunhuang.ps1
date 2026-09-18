# run_dunhuang.ps1 — same Dunhuang portrait prompt through both t2i models (flux2 klein 9b / z_image_turbo), 2MP portrait, same seed
$ErrorActionPreference = 'Continue'
$script:base = 'D:\mafei\deepseek-workspace\blender'
$script:tpl = "$script:base\_drafts"
$script:out = "$script:base\dunhuang_test"
New-Item -ItemType Directory -Force -Path $script:out | Out-Null

$prompt = 'Ultra realistic, masterpiece, best quality, cinematic luxury editorial fine art fashion portrait, two adult East Asian women in an intimate dual composition inspired by Dunhuang flying apsaras aesthetics and oriental goddess atmosphere. Both women have exquisite delicate Eastern faces, soft yet sculpted features, fair flawless skin, slender graceful figures, aura combining gentleness, divinity, sensuality and ethereal airiness. Long black hair with natural waves and silky flow, ornate golden oriental headpieces with tassels, gemstones and metal floral elements, long slender dangling gold earrings, classical oriental goddess styling. Dresses are Dunhuang apsara style high-fashion art garments in turquoise green, terracotta red and gold: minimal fabric with abundant translucent gauze, floating ribbons, metal chain and gemstone linkage structures; strapless or halter-style bodice tops adorned with gold metal ornaments, gem chains and dangling details; sheer wrapped long skirts with high slits, waist chains, leg chains, arm ornaments and shoulder veils. Thin gauze and long ribbons swirl and extend through the air creating flowing visual rhythm. One woman sits slightly left of center, posture upright and elegant, legs naturally bent and crossed, calm expression gazing straight into the camera with serene divinity and nobility; the other woman lies horizontally in the right foreground, body extended along the ground, head resting lightly near the seated womans legs, gaze tender and slightly languid, graceful and alluring. Their interaction is natural, intimate, leaning and companionable. Behind them a large circular Dunhuang mural-style decorative disc painted with flying apsara and bodhisattva figures, golden patterns along its rim, reinforcing oriental religious mural and goddess atmosphere. Multiple translucent ribbons in turquoise and terracotta coil and dance through the air around them. The floor has a subtle mirror reflection reflecting their legs and ribbons. Soft studio lighting, warm even key light from front above, delicate non-blowout skin highlights, soft shadows, ethereal sacred tranquil dreamy atmosphere. Low-saturation turquoise green, terracotta red, pale gold and cream white palette, refined restrained unified color grade, minimalist beige studio background, large negative space, graceful pose, one seated one reclining, mural halo backdrop, reflective floor, detailed skin texture, highly detailed, 8k.'

$seed = 91720260

function Submit-Wait([object]$wf, [string]$name, [int]$timeout = 1500) {
    $body = @{ prompt = $wf; client_id = 'dunhuang' } | ConvertTo-Json -Depth 10
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
        Start-Sleep -Seconds 5
        $h2 = Invoke-RestMethod -Uri "http://127.0.0.1:8188/history/$pids" -TimeoutSec 30
        if ($h2.PSObject.Properties.Name -contains $pids) {
            $e = $h2.$pids
            $el = [math]::Round(((Get-Date) - $t0).TotalSeconds, 1)
            if ($e.status.status_str -eq 'error') {
                Write-Output "$name ERROR ${el}s"
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

# ---------- flux2 klein 9b ----------
$j = Get-Content "$script:tpl\flux2_t2i_template.json" -Raw | ConvertFrom-Json
$j.'4'.inputs.text = $prompt
$j.'8'.inputs.width = 1216; $j.'8'.inputs.height = 1632
$j.'10'.inputs.width = 1216; $j.'10'.inputs.height = 1632
$j.'9'.inputs.noise_seed = $seed
$j.'13'.inputs.filename_prefix = "t2i/dunhuang_flux2"
$f1 = Submit-Wait $j "flux2" 1800

# ---------- z_image turbo ----------
$j2 = Get-Content "$script:tpl\zimg_t2i_template.json" -Raw | ConvertFrom-Json
$j2.'5'.inputs.text = $prompt
$j2.'7'.inputs.width = 1216; $j2.'7'.inputs.height = 1632
$j2.'8'.inputs.seed = $seed
$j2.'10'.inputs.filename_prefix = "t2i/dunhuang_zimg"
$f2 = Submit-Wait $j2 "zimg" 1800

# ---------- download ----------
if ($f1) { Invoke-WebRequest -Uri "http://127.0.0.1:8188/view?filename=$([uri]::EscapeDataString(($f1 -replace '^t2i/','')))&subfolder=t2i&type=output" -OutFile "$script:out\dunhuang_flux2.png" -TimeoutSec 120 }
if ($f2) { Invoke-WebRequest -Uri "http://127.0.0.1:8188/view?filename=$([uri]::EscapeDataString(($f2 -replace '^t2i/','')))&subfolder=t2i&type=output" -OutFile "$script:out\dunhuang_zimg.png" -TimeoutSec 120 }
Get-ChildItem $script:out | Select-Object Name, Length
Write-Output "DUNHUANG DONE"
