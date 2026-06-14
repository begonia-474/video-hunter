# -*- mode: python ; coding: utf-8 -*-

import os

block_cipher = None

SPEC_DIR = os.path.dirname(os.path.abspath(SPEC))

a = Analysis(
    [os.path.join(SPEC_DIR, 'main.py')],
    pathex=[SPEC_DIR],
    binaries=[],
    datas=[
        (os.path.join(SPEC_DIR, 'data', 'app.yaml'), 'data'),
        ('C:/begonia/project/GitHub/f2/f2/conf', 'f2/conf'),
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
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='f2-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
