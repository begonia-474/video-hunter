# -*- mode: python ; coding: utf-8 -*-

import os
import importlib.util

SPEC_DIR = os.path.dirname(os.path.abspath(SPEC))

# Dynamically find f2 package's conf directory
_f2_spec = importlib.util.find_spec('f2')
_f2_conf_dir = os.path.join(os.path.dirname(_f2_spec.origin), 'conf') if _f2_spec and _f2_spec.origin else None
if not _f2_conf_dir or not os.path.isdir(_f2_conf_dir):
    raise FileNotFoundError(f"f2 conf directory not found. Ensure f2 is installed: pip install f2")

a = Analysis(
    [os.path.join(SPEC_DIR, 'main.py')],
    pathex=[SPEC_DIR],
    binaries=[],
    datas=[
        (os.path.join(SPEC_DIR, 'data', 'app.yaml'), 'data'),
        (_f2_conf_dir, 'f2/conf'),
    ],
    hiddenimports=[
        'f2.apps.bark.handler',
        'f2.apps.douyin.handler',
        'f2.apps.tiktok.handler',
        'f2.apps.twitter.handler',
        'f2.apps.weibo.handler',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='video-hunter-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='video-hunter-backend',
)
