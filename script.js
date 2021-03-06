var c;
var q = new qtnIV();
var qt = q.identity(q.create());

function mouseMove(e) {
    var cw = c.width;
    var ch = c.height;
    var wh = 1 / Math.sqrt(cw * cw + ch * ch);
    var x = e.clientX - c.offsetLeft - cw * 0.5;
    var y = e.clientY - c.offsetTop - ch * 0.5;
    var sq = Math.sqrt(x * x + y * y);
    var r = sq * 2.0 * Math.PI * wh;
    if(sq != 1) {
        sq = 1 / sq;
        x *= sq;
        y *= sq;
    }
    q.rotate(r, [y, x, 0.0], qt);
}

onload = function(){
    // canvasエレメントを取得
    c = document.getElementById('canvas');
    c.width = 500;
    c.height = 500;

    c.addEventListener('mousemove', mouseMove, true);

    // webglコンテキストを取得
    var gl = c.getContext('webgl') || c.getContext('experimental-webgl');

    var v_shader = create_shader('vs');
    var f_shader = create_shader('fs');
    var prg = create_program(v_shader, f_shader);

    var attLocation = new Array();
    attLocation[0] = gl.getAttribLocation(prg, 'position');
    attLocation[1] = gl.getAttribLocation(prg, 'normal');
    attLocation[2] = gl.getAttribLocation(prg, 'color');

    // attributeの要素数(この場合は xyz の3要素)
    var attStride = new Array();
    attStride[0] = 3;
    attStride[1] = 3;
    attStride[2] = 4;

    var cubeData = cube(2.0, [1.0, 1.0, 1.0, 1.0]);
    var cPosition = create_vbo(cubeData.p);
    var cNormal   = create_vbo(cubeData.n);
    var cColor    = create_vbo(cubeData.c);
    var cVBOList  = [cPosition, cNormal, cColor];
    var cIndex    = create_ibo(cubeData.i);

    var sphereData = sphere(64, 64, 2.5, [1.0, 1.0, 1.0, 1.0]);
    var sPosition = create_vbo(sphereData.p);
    var sNormal = create_vbo(sphereData.n);
    var sColor = create_vbo(sphereData.c);
    var sVBOList = [sPosition, sNormal, sColor];
    var sIndex = create_ibo(sphereData.i);

    var torusData = torus(64, 64, 1.0, 2.0, [1.0, 1.0, 1.0, 1.0]);
    var tPosition = create_vbo(torusData.p);
    var tNormal   = create_vbo(torusData.n);
    var tColor    = create_vbo(torusData.c);
    var tVBOList  = [tPosition, tNormal, tColor];
    var tIndex    = create_ibo(torusData.i);
    
    // uniformLocationの取得
    var uniLocation = new Array();
    uniLocation[0] = gl.getUniformLocation(prg, 'mMatrix');
    uniLocation[1] = gl.getUniformLocation(prg, 'mvpMatrix');
    uniLocation[2] = gl.getUniformLocation(prg, 'eyePosition');
    uniLocation[3] = gl.getUniformLocation(prg, 'cubeTexture');
    uniLocation[4] = gl.getUniformLocation(prg, 'reflection');

    // minMatrix.js を用いた行列関連処理
    // matIVオブジェクトを生成
    var m = new matIV();
    
    // 各種行列の生成と初期化
    var mMatrix = m.identity(m.create());
    var vMatrix = m.identity(m.create());
    var pMatrix = m.identity(m.create());
    var tmpMatrix = m.identity(m.create());
    var mvpMatrix = m.identity(m.create());

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    var cubeTexture = null;

    var cubeSource = new Array( 'cube_PX.png',
                                'cube_PY.png',
                                'cube_PZ.png',
                                'cube_NX.png',
                                'cube_NY.png',
                                'cube_NZ.png');

    var cubeTarget = new Array(gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                               gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                               gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                               gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                               gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                               gl.TEXTURE_CUBE_MAP_NEGATIVE_Z);
    
    create_cube_texture(cubeSource, cubeTarget);

    var eyePosition = [0.0, 0.0, 20.0];

    var count = 0;

    (function() {
                                   
        count++;
        var rad = (count % 360) * Math.PI / 180;
        var rad2 = ((count + 180) % 360) * Math.PI / 180;

        gl.clearColor(0.0,0.0,0.0,1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        var camUp = new Array();
        q.toVecIII([0.0, 0.0, 20.0], qt, eyePosition);
        q.toVecIII([0.0, 1.0, 0.0], qt, camUp);
        m.lookAt(eyePosition, [0, 0, 0], camUp, vMatrix);
        m.perspective(45, c.width / c.height, 0.1, 200, pMatrix);
        m.multiply(pMatrix, vMatrix, tmpMatrix);

        set_attribute(cVBOList, attLocation, attStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cIndex);

        m.identity(mMatrix);
        m.scale(mMatrix, [100.0, 100.0, 100.0], mMatrix);
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
        gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
        gl.uniform3fv(uniLocation[2], eyePosition);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
        gl.uniform1i(uniLocation[3], 0);
        gl.uniform1i(uniLocation[4], false);
        gl.drawElements(gl.TRIANGLES, cubeData.i.length, gl.UNSIGNED_SHORT, 0);

        set_attribute(sVBOList, attLocation, attStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndex);

        m.identity(mMatrix);
        m.rotate(mMatrix, rad, [0, 0, 1], mMatrix);
        m.translate(mMatrix, [5.0, 0.0, 0.0], mMatrix);
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
        gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
        gl.uniform1i(uniLocation[4], true);
        gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);

        set_attribute(tVBOList, attLocation, attStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);

        m.identity(mMatrix);
        m.rotate(mMatrix, rad2, [0, 0, 1], mMatrix);
        m.translate(mMatrix, [5.0, 0.0, 0.0], mMatrix);
        m.rotate(mMatrix, rad, [1, 0, 1], mMatrix);
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
        gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
        gl.uniform1i(uniLocation[4], true);
        gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);

        // コンテキストの再描画
        gl.flush();

        setTimeout(arguments.callee, 1000/30);
    })();

    // シェーダを生成する関数
    function create_shader(id){
        // シェーダを格納する変数
        var shader;

        // HTMLからscriptタグへの参照を取得
        var scriptElement = document.getElementById(id);


        // scriptタグが存在しない場合は抜ける
        if(!scriptElement){return;}

        // scriptタグのtype属性をチェック
        switch(scriptElement.type){

            // 頂点シェーダの場合
            case 'x-shader/x-vertex':
                shader = gl.createShader(gl.VERTEX_SHADER);
                break;

            // フラグメントシェーダの場合
            case 'x-shader/x-fragment':
                shader = gl.createShader(gl.FRAGMENT_SHADER);
                break;
            default :
                return;
        }

        // 生成されたシェーダにソースを割り当てる
        gl.shaderSource(shader, scriptElement.text);

        // シェーダをコンパイルする
        gl.compileShader(shader);

        // シェーダが正しくコンパイルされたかチェック
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){

            // 成功していたらシェーダを返して終了
            return shader;
        }else{

            // 失敗していたらエラーログをアラートする
            alert(gl.getShaderInfoLog(shader));
        }
    }

    // プログラムオブジェクトを生成しシェーダをリンクする関数
    function create_program(vs, fs){
        // プログラムオブジェクトの生成
        var program = gl.createProgram();

        // プログラムオブジェクトにシェーダを割り当てる
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);

        // シェーダをリンク
        gl.linkProgram(program);

        // シェーダのリンクが正しく行なわれたかチェック
        if(gl.getProgramParameter(program, gl.LINK_STATUS)){

            // 成功していたらプログラムオブジェクトを有効にする
            gl.useProgram(program);

            // プログラムオブジェクトを返して終了
            return program;
        }else{

            // 失敗していたらエラーログをアラートする
            alert(gl.getProgramInfoLog(program));
        }
    }

    // VBOを生成する関数
    function create_vbo(data){
        // バッファオブジェクトの生成
        var vbo = gl.createBuffer();

        // バッファをバインドする
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

        // バッファにデータをセット
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

        // バッファのバインドを無効化
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // 生成した VBO を返して終了
        return vbo;
    }

    function create_ibo(data){
        var ibo = gl.createBuffer();

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        return ibo;
    }

    function set_attribute(vbo, attL, attS) {
        
        for(var i in vbo) {
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
            gl.enableVertexAttribArray(attL[i]);
            gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
        }
    }

    function create_texture(source, number) {
        var img = new Image();

        img.onload = function() {
            var tex = gl.createTexture();
            
            gl.bindTexture(gl.TEXTURE_2D, tex);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA , gl.RGBA, gl.UNSIGNED_BYTE, img);

            gl.generateMipmap(gl.TEXTURE_2D);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

            switch(number) {
                case 0:
                    texture0 = tex;
                    break;
                case 1:
                    texture1 = tex;
                    break;
                default:
                    break;
            }
            gl.bindTexture(gl.TEXTURE_2D, null);
        };

        img.src = source;
    }

    function create_cube_texture(source, target) {
        
        var cImg = new Array();

        for(var i = 0; i < source.length; ++i) {
            cImg[i] = new cubeMapImage();
            cImg[i].data.src = source[i];
        }

        function cubeMapImage() {
            this.data = new Image();

            this.data.onload = function() {
                this.imageDataLoaded = true;
                checkLoaded();
            };
        }

        function checkLoaded() {
            if(cImg[0].data.imageDataLoaded &&
               cImg[1].data.imageDataLoaded &&
               cImg[2].data.imageDataLoaded &&
               cImg[3].data.imageDataLoaded &&
               cImg[4].data.imageDataLoaded &&
               cImg[5].data.imageDataLoaded) {
                generateCubeMap();
            }
        }

        function generateCubeMap() {
            var tex = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);

            for(var j = 0; j < source.length; ++j) {
                gl.texImage2D(target[j], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cImg[j].data);
            }

            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            cubeTexture = tex;

            gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
        }
    }

    function create_framebuffer(width, height) {

        var frameBuffer = gl.createFramebuffer();

        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

        var depthRenderBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);

        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);

        var fTexture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, fTexture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0); 

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return {f: frameBuffer, d : depthRenderBuffer, t: fTexture};       
    }
};
