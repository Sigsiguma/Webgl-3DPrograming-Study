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
    var  c = document.getElementById('canvas');
    c.width = 500;
    c.height = 300;

    var eLines = document.getElementById('lines');
    var eLineStrip = document.getElementById('line_strip');
    var eLineLoop = document.getElementById('line_loop');
    var ePointSize = document.getElementById('point_size');

    c.addEventListener('mousemove', mouseMove, true);

    // webglコンテキストを取得
    var gl = c.getContext('webgl') || c.getContext('experimental-webgl');

    var pointSizeRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    console.log('pointSizeRange:'  + pointSizeRange[0] + 'to' + pointSizeRange[1]);

    // 頂点シェーダとフラグメントシェーダの生成
    var v_shader = create_shader('vs');
    var f_shader = create_shader('fs');

    // プログラムオブジェクトの生成とリンク
    var prg = create_program(v_shader, f_shader);

    var attLocation = new Array();
    attLocation[0] = gl.getAttribLocation(prg, 'position');
    attLocation[1] = gl.getAttribLocation(prg, 'color');

    // attributeの要素数(この場合は xyz の3要素)
    var attStride = new Array();
    attStride[0] = 3;
    attStride[1] = 4;
    
    var pointSphere = sphere(16, 16, 2.0);
    var pPos = create_vbo(pointSphere.p);
    var pCol = create_vbo(pointSphere.c);
    var pVBOList = [pPos, pCol];

    var position = [
        -1.0 , -1.0, 0.0,
         1.0, -1.0, 0.0,
        -1.0, 1.0, 0.0,
        1.0 , 1.0, 0.0
    ];


    var color = [
        1.0, 1.0, 1.0, 1.0,
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0
    ];

    var lPos = create_vbo(position);
    var lCol = create_vbo(color);
    var lVBOList = [lPos, lCol];

    // uniformLocationの取得
    var uniLocation = new Array();
    uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
    uniLocation[1] = gl.getUniformLocation(prg, 'pointSize');

    // minMatrix.js を用いた行列関連処理
    // matIVオブジェクトを生成
    var m = new matIV();
    
    // 各種行列の生成と初期化
    var mMatrix = m.identity(m.create());
    var vMatrix = m.identity(m.create());
    var pMatrix = m.identity(m.create());
    var tmpMatrix = m.identity(m.create());
    var mvpMatrix = m.identity(m.create());
    var qMatrix   = m.identity(m.create());

    var count = 0;
    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    (function() {

        gl.clearColor(0.0,0.0,0.0,1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        count++;

        var rad = (count % 360) * Math.PI / 180;

        var qMatrix = m.identity(m.create());
        q.toMatIV(qt, qMatrix);

        var camPosition = [0.0, 5.0, 10.0];
        m.lookAt(camPosition, [0, 0, 0], [0, 1, 0], vMatrix);
        m.multiply(vMatrix, qMatrix, vMatrix);
        m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
        m.multiply(pMatrix, vMatrix, tmpMatrix);

        var pointSize = ePointSize.value / 10;

        set_attribute(pVBOList, attLocation, attStride);
        m.identity(mMatrix);
        m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
        gl.uniform1f(uniLocation[1], pointSize);
        gl.drawArrays(gl.POINTS, 0, pointSphere.p.length / 3);

        var lineOption = 0;
        if(eLines.checked) { lineOption = gl.LINES; }
        if(eLineStrip.checked) { lineOption = gl.LINE_STRIP; }
        if(eLineLoop.checked) { lineOption = gl.LINE_LOOP;   }

        set_attribute(lVBOList, attLocation, attStride);
        m.identity(mMatrix);
        m.rotate(mMatrix, Math.PI / 2, [1, 0, 0], mMatrix);
        m.scale(mMatrix, [3.0, 3.0, 1.0], mMatrix);
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
        gl.drawArrays(lineOption, 0, position.length / 3);

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

    function torus(row, column, irad, orad, color){
        var pos = new Array(), nor = new Array(),
            col = new Array(), idx = new Array();

        for(var i = 0; i <= row; ++i){
            var r = Math.PI * 2 / row * i;
            var rr = Math.cos(r);
            var ry = Math.sin(r);
            
            for(var ii = 0; ii <= column; ++ii) {
                var tr = Math.PI * 2 / column * ii; 
                var tx = (rr * irad + orad) * Math.cos(tr);
                var ty = ry * irad;
                var tz = (rr * irad + orad) * Math.sin(tr);
                var rx = rr * Math.cos(tr);
                var rz = rr * Math.sin(tr);
                pos.push(tx, ty, tz);
                nor.push(rx, ry, rz);
                if(color) {
                    var tc = color;
                } else {
                    tc = hsva(360 / column * ii, 1, 1, 1);
                }
                col.push(tc[0], tc[1], tc[2], tc[3]);
            }
        }

        for(i = 0; i < row; ++i) {
            for(ii = 0; ii < column; ++ii) {
                r = (column + 1) *i + ii;
                idx.push(r, r + column + 1, r + 1);
                idx.push(r + column + 1, r + column + 2, r +1);
            }
        }
    
        return { p: pos, n : nor, c : col, i : idx  };
    }

    function hsva(h, s, v, a) {
        if(s > 1 || v > 1 || a > 1) { return;  } 

        var th = h % 360;
        var i = Math.floor(th / 60);
        var f = th / 60 - i;
        var m = v * (1 - s);
        var n = v * (1 - s - f);
        var k = v * (1 - s * (1 - f));
        var color = new Array();
        if(!s > 0 && !s < 0) {
            color.push(v, v, v, a);
        } else {
            var r = new Array(v, n, m, m, k, v);
            var g = new Array(k, v, v, n, m, m);
            var b = new Array(m, m, k, v, v, n);
            color.push(r[i], g[i], b[i], a);
        }

        return color;
    }

    function sphere(row, column, rad, color) {
        var pos = new Array(), nor = new Array(),
            col = new Array(), idx = new Array();

        for(var i =0; i <= row; ++i) {
            var r= Math.PI / row * i;
            var ry = Math.cos(r);
            var rr = Math.sin(r);

            for(var ii =0; ii <= column; ++ii) {
                var tr = Math.PI * 2 /column * ii;
                var tx = rr * rad * Math.cos(tr);
                var ty = ry * rad;
                var tz = rr * rad * Math.sin(tr);
                var rx = rr * Math.cos(tr);
                var rz = rr * Math.sin(tr);
                
                if(color) {
                    var tc = color;
                } else {
                    tc = hsva(360 / row * i , 1, 1, 1);
                }
                pos.push(tx, ty, tz);
                nor.push(rx, ry, rz);
                col.push(tc[0], tc[1], tc[2], tc[3]);
            }
        }

        r= 0;
        for(i = 0; i< row; ++i) {
            for(ii = 0; ii < column; ++ii) {
                r = (column + 1) * i +ii;
                idx.push(r, r+1, r+ column + 2);
                idx.push(r, r+ column + 2, r + column + 1);
            }
        }

        return { p: pos, n : nor, c : col, i : idx };
    }
};
