var c;
var q = new qtnIV();
var qt = q.identity(q.create());

function mouseMove(e) {
    var cw = c.width;
    var ch = c.height;
    var wh = 1 / Math.sqrt(cw * cw + ch * ch);
    var x  = e.clientX - c.offsetLeft - cw * 0.5;
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
    c.height = 300;

    c.addEventListener('mousemove', mouseMove, true);

    // webglコンテキストを取得
    var gl = c.getContext('webgl', {stencil: true }) || c.getContext('experimental-webgl', {stencil: true });

    // 頂点シェーダとフラグメントシェーダの生成
    var v_shader = create_shader('vs');
    var f_shader = create_shader('fs');

    // プログラムオブジェクトの生成とリンク
    var prg = create_program(v_shader, f_shader);

    var attLocation = new Array();
    attLocation[0] = gl.getAttribLocation(prg, 'position');
    attLocation[1] = gl.getAttribLocation(prg, 'normal');
    attLocation[2] = gl.getAttribLocation(prg, 'color');
    attLocation[3] = gl.getAttribLocation(prg, 'textureCoord');

    // attributeの要素数(この場合は xyz の3要素)
    var attStride = new Array();
    attStride[0] = 3;
    attStride[1] = 3;
    attStride[2] = 4;
    attStride[3] = 2;

    var torusData = torus(64, 64, 0.25, 1.0);
    var tPosition = create_vbo(torusData.p);
    var tNormal   = create_vbo(torusData.n);
    var tColor    = create_vbo(torusData.c);
    var tTextureCoord = create_vbo(torusData.t);
    var tVBOList  = [tPosition, tNormal, tColor, tTextureCoord];
    var tIndex    = create_ibo(torusData.i);
    
    var sphereData = sphere(64, 64, 1.0, [1.0, 1.0, 1.0, 1.0]);
    var sPotision  = create_vbo(sphereData.p);
    var sNormal    = create_vbo(sphereData.n);
    var sColor     = create_vbo(sphereData.c);
    var sTextureCoord = create_vbo(sphereData.t);
    var sVBOList   = [sPotision, sNormal, sColor, sTextureCoord];
    var sIndex     = create_ibo(sphereData.i);

    // uniformLocationの取得
    var uniLocation = new Array();
    uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
    uniLocation[1] = gl.getUniformLocation(prg, 'invMatrix');
    uniLocation[2] = gl.getUniformLocation(prg, 'lightDirection');
    uniLocation[3] = gl.getUniformLocation(prg, 'useLight');
    uniLocation[4] = gl.getUniformLocation(prg, 'texture');
    uniLocation[5] = gl.getUniformLocation(prg, 'useTexture');
    uniLocation[6] = gl.getUniformLocation(prg, 'outline');

    // minMatrix.js を用いた行列関連処理
    // matIVオブジェクトを生成
    var m = new matIV();
    
    // 各種行列の生成と初期化
    var mMatrix = m.identity(m.create());
    var vMatrix = m.identity(m.create());
    var pMatrix = m.identity(m.create());
    var tmpMatrix = m.identity(m.create());
    var mvpMatrix = m.identity(m.create());
    var invMatrix = m.identity(m.create());

    var lightDirection = [1.0, 1.0, 1.0];

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    var texture = null;
    create_texture('texture1.png');

    var count = 0;

    (function() {
                                   
        gl.clearColor(0.0,0.0,0.0,1.0);
        gl.clearDepth(1.0);
        gl.clearStencil(0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        count++;
        var rad = (count % 360) * Math.PI / 180;

        m.lookAt([0.0, 0.0, 10.0], [0, 0, 0], [0, 1, 0], vMatrix);
        m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
        var qMatrix = m.identity(m.create());
        q.toMatIV(qt, qMatrix);
        m.multiply(vMatrix, qMatrix, vMatrix);
        m.multiply(pMatrix, vMatrix, tmpMatrix);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.enable(gl.STENCIL_TEST);

        gl.colorMask(false, false, false, false);
        gl.depthMask(false);

        gl.stencilFunc(gl.ALWAYS, 1, ~0);
        gl.stencilOp(gl.KEEP, gl.REPLACE, gl.REPLACE);

        set_attribute(tVBOList, attLocation, attStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);

        m.identity(mMatrix);
        m.rotate(mMatrix, rad, [0.0, 1.0, 1.0], mMatrix);
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);

        gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
        gl.uniform1i(uniLocation[3], false);
        gl.uniform1i(uniLocation[5], false);
        gl.uniform1i(uniLocation[6], true);
        gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
       
        gl.colorMask(true, true, true, true);
        gl.depthMask(true);

        gl.stencilFunc(gl.EQUAL, 0, ~0);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

        set_attribute(sVBOList, attLocation, attStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndex);

        m.identity(mMatrix);
        m.scale(mMatrix, [50.0, 50.0, 50.0], mMatrix);
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);

        gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
        gl.uniform1i(uniLocation[3], false);
        gl.uniform1i(uniLocation[4], 0);
        gl.uniform1i(uniLocation[5], true);
        gl.uniform1i(uniLocation[6], false);
        gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);

        gl.disable(gl.STENCIL_TEST);

        set_attribute(tVBOList, attLocation, attStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);

        m.identity(mMatrix);
        m.rotate(mMatrix, rad, [0.0, 1.0, 1.0], mMatrix);
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);

        gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation[1], false, invMatrix);
        gl.uniform3fv(uniLocation[2], lightDirection);
        gl.uniform1i(uniLocation[3], true);
        gl.uniform1i(uniLocation[5], false);
        gl.uniform1i(uniLocation[6], false);
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

    function create_texture(source) {
        var img = new Image();

        img.onload = function() {
            var tex = gl.createTexture();
            
            gl.bindTexture(gl.TEXTURE_2D, tex);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA , gl.RGBA, gl.UNSIGNED_BYTE, img);

            gl.generateMipmap(gl.TEXTURE_2D);

            gl.bindTexture(gl.TEXTURE_2D, null);

            texture = tex;
        };

        img.src = source;
    }
};
