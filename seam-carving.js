
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext('2d');
var canvasdraw = document.getElementById("canvas_draw");
var ctxdraw = canvasdraw.getContext('2d');

var time = {
  start:0,
  stop:0,
  begin: function() {
    this.start = new Date();
  },
  end: function() {
    this.stop = new Date();
  },
  interval_seconds: function() {
    return (this.stop.getTime() - this.start.getTime()) / 1000;
  }
}

window.onload = function() {
  IMG_LOADED = false;
  IMG_RESCALE = .7;
  SIZE = 10;
  GRAD_INCREASE = 99;
  DRAW_VISIBLE = true;
  MAX_ADD_SEAMS = 4;
  TOTAL_SEAMS_ADDED = 0;

  // load image
  var img = new Image();
  img.src = './p3.png';
  img.crossOrigin = "Anonymous";
  img.onload = function() {
    var width_scaled = img.width * IMG_RESCALE;
    var height_scaled = img.height * IMG_RESCALE;
    ctx.canvas.width = width_scaled;
    ctx.canvas.height = height_scaled;
    ctxdraw.canvas.width = width_scaled
    ctxdraw.canvas.height = height_scaled;
    ctx.drawImage(img, 0, 0, width_scaled, height_scaled);
    resizeCanvases(width_scaled,height_scaled);
    IMG_LOADED = true;
  }


  mousedown = false;
  canvasdraw.addEventListener('mousedown',function(e){
    drawCircle(canvasdraw,ctxdraw,e);
    mousedown=true;
  },true);
  canvasdraw.addEventListener('mousemove',function(e){
    if (mousedown) {
      drawCircle(canvasdraw,ctxdraw,e)
    }
  },true);
  canvasdraw.addEventListener('mouseup',function(e){
    mousedown=false;
  },true);

  // Key handler
  var keyState = {};
  window.addEventListener('keydown',function(e){
      keyState[e.keyCode || e.which] = true;
  },true);
  window.addEventListener('keyup',function(e){
      keyState[e.keyCode || e.which] = false;
  },true);
  function key_handler_loop() {
    if (keyState[86]) remove_vertical_seams()
    if (keyState[72]) remove_horizontal_seams()
    if (keyState[65]) add_vertical_seam()
    setTimeout(key_handler_loop, 10);
  }
  key_handler_loop();


  // hide drawing board
  document.getElementById("hide").addEventListener("click", function(){
    DRAW_VISIBLE = !DRAW_VISIBLE;
    if (DRAW_VISIBLE) {
      canvasdraw.style.display = 'block';
    } else {
      canvasdraw.style.display = 'none';
    }
  });
  // clear drawing board
  document.getElementById("clear").addEventListener("click", function(){
    ctxdraw.clearRect(0, 0, canvasdraw.width, canvasdraw.height);
  });

  function resizeCanvases(width_scaled,height_scaled) {
    document.getElementById("canvas-container").style.width= width_scaled+'px'
    document.getElementById("canvas-container").style.height= height_scaled+'px'
  }

  function drawCircle(canvas,context,event) {
    p = getMousePos(canvas, event)
    x = p.x
    y = p.y
    context.beginPath();
    context.globalAlpha = 0.09
    context.fillRect(x,y,SIZE,SIZE);
    context.fillStyle  = 'red'
    context.fill();
    context.globalAlpha = 1
  }
  function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  function add_vertical_seam() {
    if (!IMG_LOADED) return; // stops if an image isn't loaded.

    // get the image and rescale the canvas
    image_data = ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height);
    draw_data = ctxdraw.getImageData(0,0,ctxdraw.canvas.width,ctxdraw.canvas.height);
    pre_width = ctx.canvas.width;
    pre_height = ctx.canvas.height;
    ctx.canvas.width = ctx.canvas.width+1;
    ctxdraw.canvas.width = ctx.canvas.width+1;

    ctx.putImageData(image_data,0,0);
    resizeCanvases(ctx.canvas.width,ctx.canvas.height);

    image_data = ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height);
    draw_data = ctxdraw.getImageData(0,0,ctxdraw.canvas.width,ctxdraw.canvas.height);

    width = ctx.canvas.width;
    height = ctx.canvas.height;

    TOTAL_SEAMS_ADDED += MAX_ADD_SEAMS;

    width = Math.abs(width-TOTAL_SEAMS_ADDED)

    // set up array for gradient values
    var grad = new Array(width)
    for (i = 0; i < width; i++){
      grad[i] = new Array(height)
    }

    // canvas pixels are one linear array. Each pixel is rgba so the total size is w*h*4
    nWidth = width*4;
    nHeight = height*4;

    // compute gradient map for the image
    for (y = 0; y < nHeight; y+=4) {
      for (x = 0; x < nWidth; x+=4) {

        idx = x + y * width

        center_r = image_data.data[idx]
        center_g = image_data.data[idx+1]
        center_b = image_data.data[idx+2]
        center_a = image_data.data[idx+3]

        left = (x == 0 ? idx : ( (x-4) + y * width))
        right = (x == nWidth-1 ? idx : ( (x+4) + y * width))

        left_r = image_data.data[left]
        left_g = image_data.data[left+1]
        left_b = image_data.data[left+2]
        left_a = image_data.data[left+3]

        right_r = image_data.data[right]
        right_g = image_data.data[right+1]
        right_b = image_data.data[right+2]
        right_a = image_data.data[right+3]

        r = left_r - right_r;
        g = left_g - right_g;
        b = left_b - right_b;

        distance = Math.sqrt(r*r + g*g + b*b);

        draw_r = draw_data.data[idx]
        draw_g = draw_data.data[idx+1]
        draw_b = draw_data.data[idx+2]
        draw_a = draw_data.data[idx+3]
        color = (draw_r+draw_g+draw_b+draw_a)
        if (color > 0) {
          distance += GRAD_INCREASE
        }

        grad[x/4][y/4] = distance
      }
    }

    // create grid to store fitness values
    var vertical_fitness = new Array(width)
    for (var i = 0; i < vertical_fitness.length; i++) {
      vertical_fitness[i] = new Array(height)
    }

    // populate grid with initial values on the bottom row.
    for (var x = 0; x < vertical_fitness.length; x++) {
      vertical_fitness[x][0] = grad[x][0]
    }

    // sum up gradients from bottom to top for each pixel
    for (y = 1; y < height; y++) {
      for (x = 0; x < width; x++) {
        vertical_fitness[x][y] = grad[x][y]
        if (x == 0) {
          vertical_fitness[x][y] += Math.min(vertical_fitness[x][y-1], vertical_fitness[x+1][y-1]);
        } else if (x == width-1) {
          vertical_fitness[x][y] += Math.min(vertical_fitness[x][y-1], vertical_fitness[x-1][y-1]);
        } else {
          vertical_fitness[x][y] += Math.min(vertical_fitness[x-1][y-1], vertical_fitness[x][y-1], vertical_fitness[x+1][y-1]);
        }
      }
    }

    var sorted_vals = []

    // get tails of seams with their indices
    for (var x = 0; x < vertical_fitness.length; x++) {
      y = height-1
      val = vertical_fitness[x][y]
      val = val || 1 // some values are NaN. Not sure why...
      sorted_vals.push([x,y,val])
    }

    // sort the tails of seams smallest first
    sorted_vals.sort(function(a,b){
      return a[2] - b[2]
    });

    // take first n smallest seams
    sorted_vals = sorted_vals.slice(0,MAX_ADD_SEAMS);

    seams = []
    for (var i=0; i<sorted_vals.length;i++){

      // to contain the complete seam coordinates
      complete_seam = new Array()

      // get starting value
      starting_pos = sorted_vals[i]
      starting_x = starting_pos[0]
      starting_y = starting_pos[1]

      // add to the complete seam
      complete_seam.push([starting_x,starting_y])

      // init current position
      var current_x = starting_x

      // walk from top to bottom taking minimum step at each iteration.
      for (var y = starting_y; y>=0; y--) {
        left_x = (current_x == 0) ? current_x : (current_x-1);
        right_x = (current_x >= width-1) ? current_x : (current_x+1);
        down_y = (y == 0) ? y : (y-1);
        l = vertical_fitness[left_x][down_y]
        r = vertical_fitness[right_x][down_y]
        f = vertical_fitness[current_x][down_y]
        current_x = (l < r) ? ( (l < f) ? left_x : current_x ) : (r < f ? right_x : current_x)
        complete_seam.push([current_x,y])
      }

      // add the collection of complete seams
      seams.push(complete_seam)
    }

    // draw the seams
    // for (var i=0;i<seams.length;i++) {
    //   seam = seams[i];
    //   // draw each coordinate on the main img
    //   for (var j=0; j<seam.length; j++) {
    //    x = seam[j][0]
    //    y = seam[j][1]
    //    z = (x*4 + (height-1-y)*4 * ctx.canvas.width)
    //    image_data.data[z+0]=255;
    //    image_data.data[z+1]=0;
    //    image_data.data[z+2]=0;
    //    image_data.data[z+3]=255;
    //   }
    // }

    var old_image = ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height);
    width = ctx.canvas.width -1
    height = ctx.canvas.height
    for (y = 0; y<height; y++) {

      seam_xs = []
      for (iter=0;iter<seams.length;iter++) {
        seam_xs.push(seams[iter][height-1-y][0])
      }

      x_offset = 0

      for (x = 0; x<width; x++) {
        // check if this x is part of a seam
        if(seam_xs.indexOf(x) > -1) {
          idx = x*4 + (height-1-y)*4 * ctx.canvas.width
          // image_data.data[idx+0]=255
          // image_data.data[idx+1]=0
          // image_data.data[idx+2]=0
          // image_data.data[idx+3]=255
          image_data.data[idx+0]=image_data.data[idx+0]
          image_data.data[idx+1]=image_data.data[idx+1]
          image_data.data[idx+2]=image_data.data[idx+2]
          image_data.data[idx+3]=image_data.data[idx+3]

          draw_data.data[idx+0]=draw_data.data[idx+0]
          draw_data.data[idx+1]=draw_data.data[idx+1]
          draw_data.data[idx+2]=draw_data.data[idx+2]
          draw_data.data[idx+3]=draw_data.data[idx+3]

          n_idx = (x+1)*4 + (height-1-y)*4 * ctx.canvas.width
          image_data.data[n_idx+0]=image_data.data[idx+0]
          image_data.data[n_idx+1]=image_data.data[idx+1]
          image_data.data[n_idx+2]=image_data.data[idx+2]
          image_data.data[n_idx+3]=image_data.data[idx+3]

          draw_data.data[n_idx+0]=draw_data.data[idx+0]
          draw_data.data[n_idx+1]=draw_data.data[idx+1]
          draw_data.data[n_idx+2]=draw_data.data[idx+2]
          draw_data.data[n_idx+3]=draw_data.data[idx+3]

          x_offset = 1
        } else {
          new_img_idx = (x+x_offset)*4 + (height-1-y)*4 * ctx.canvas.width
          old_img_idx = x*4 + (height-1-y)*4 * ctx.canvas.width
          image_data.data[new_img_idx+0]=old_image.data[old_img_idx+0]
          image_data.data[new_img_idx+1]=old_image.data[old_img_idx+1]
          image_data.data[new_img_idx+2]=old_image.data[old_img_idx+2]
          image_data.data[new_img_idx+3]=old_image.data[old_img_idx+3]

          draw_data.data[new_img_idx+0]=draw_data.data[old_img_idx+0]
          draw_data.data[new_img_idx+1]=draw_data.data[old_img_idx+1]
          draw_data.data[new_img_idx+2]=draw_data.data[old_img_idx+2]
          draw_data.data[new_img_idx+3]=draw_data.data[old_img_idx+3]
        }
      }
    }
    ctx.putImageData(image_data,0,0);
    ctxdraw.putImageData(draw_data,0,0);
  }

  function remove_vertical_seams() {

    if (!IMG_LOADED) return; // stops if an image isn't loaded.

    // get the image and rescale the canvas
    image_data = ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height);
    height = image_data.height;
    width = image_data.width;

    ctx.canvas.width = width;
    ctx.canvas.height = height;

    resizeCanvases(width,height);

    draw_data = ctxdraw.getImageData(0,0,ctxdraw.canvas.width,ctxdraw.canvas.height);

    /**
    * Compute the gradient maps in horizontal and vertical directions.
    * Draws the gradients maps as images to the canvas
    **/

    // set up array for gradient values
    var grad = new Array(width)
    for (i = 0; i < width; i++){
      grad[i] = new Array(height)
    }

    // canvas pixels are one linear array. Each pixel is rgba so the total size is w*h*4
    nWidth = width*4;
    nHeight = height*4;

    // compute gradient map for the image
    for (y = 0; y < nHeight; y+=4) {
      for (x = 0; x < nWidth; x+=4) {

        idx = x + y * width

        center_r = image_data.data[idx]
        center_g = image_data.data[idx+1]
        center_b = image_data.data[idx+2]
        center_a = image_data.data[idx+3]

        left = (x == 0 ? idx : ( (x-4) + y * width))
        right = (x == nWidth-1 ? idx : ( (x+4) + y * width))

        left_r = image_data.data[left]
        left_g = image_data.data[left+1]
        left_b = image_data.data[left+2]
        left_a = image_data.data[left+3]

        right_r = image_data.data[right]
        right_g = image_data.data[right+1]
        right_b = image_data.data[right+2]
        right_a = image_data.data[right+3]

        r = left_r - right_r;
        g = left_g - right_g;
        b = left_b - right_b;

        distance = Math.sqrt(r*r + g*g + b*b);

        draw_r = draw_data.data[idx]
        draw_g = draw_data.data[idx+1]
        draw_b = draw_data.data[idx+2]
        draw_a = draw_data.data[idx+3]
        color = (draw_r+draw_g+draw_b+draw_a)
        if (color > 0) {
          distance += GRAD_INCREASE
        }

        grad[x/4][y/4] = distance
      }
    }

    /**
    * Find the minimum vertical seam
    **/
    vertical_fitness = new Array(width)
    for (var i = 0; i < width; i++) {
      vertical_fitness[i] = new Array(height)
    }
    for (var x = 0; x < width; x++) {
      vertical_fitness[x][0] = grad[x][0]
    }

    // 0,0 coordinates of the canvas are top left.
    // sums up minimum gradients values from the top of the image to the bottom for every pixel.
    for (y = 1; y < height; y++) {
      for (x = 0; x < width; x++) {
        vertical_fitness[x][y] = grad[x][y]
        if (x == 0) {
          vertical_fitness[x][y] += Math.min(vertical_fitness[x][y-1], vertical_fitness[x+1][y-1]);
        } else if (x == width-1) {
          vertical_fitness[x][y] += Math.min(vertical_fitness[x][y-1], vertical_fitness[x-1][y-1]);
        } else {
          vertical_fitness[x][y] += Math.min(vertical_fitness[x-1][y-1], vertical_fitness[x][y-1], vertical_fitness[x+1][y-1]);
        }
      }
    }

    // Start the bottom of the image (where the total gradient sums are)
    // Traverses a path of pixels by moving to next minimum gradient.
    var best = 0
    for (var x = 0; x < width; x++) {
      best = (vertical_fitness[x][height-1] < vertical_fitness[best][height-1]) ? x : best
    }

    // Seam array contains the coordinates of the least cost seam
    seam = new Array()
    seam[0] = [best,y]
    for (y = height-1; y >= 0; y--) {
      left = (best == 0) ? best : (best-1);
      right = (best == width-1) ? best : (best+1);
      forward = (y == 0) ? y : (y-1);
      l = vertical_fitness[left][forward]
      r = vertical_fitness[right][forward]
      f = vertical_fitness[best][forward]
      best = (l < r) ? ( (l < f) ? left : best ) : (r < f ? right : best)
      seam.push([best,y])
    }

    /**
    * Remove the seam from the original image.
    **/
    for (y = 0; y<height; y++) {
      x_offset = 0;
      for (x = 0; x<width; x++) {
        if (seam[y][0] == x) x_offset = 1

        // remove seam from original image
        new_image_idx = (x*4 + (height-1-y)*4 * ctx.canvas.width) // rotate the seam
        old_image_idx = ((x+x_offset)*4 + (height-1-y)*4 * ctx.canvas.width)
        image_data.data[new_image_idx+0]=image_data.data[old_image_idx];
        image_data.data[new_image_idx+1]=image_data.data[old_image_idx+1];
        image_data.data[new_image_idx+2]=image_data.data[old_image_idx+2];
        image_data.data[new_image_idx+3]=image_data.data[old_image_idx+3];

        // remove seam from drawing canvas
        draw_data.data[new_image_idx+0]=draw_data.data[old_image_idx];
        draw_data.data[new_image_idx+1]=draw_data.data[old_image_idx+1];
        draw_data.data[new_image_idx+2]=draw_data.data[old_image_idx+2];
        draw_data.data[new_image_idx+3]=draw_data.data[old_image_idx+3];
      }
    }

    ctx.canvas.width = ctx.canvas.width-1;
    ctxdraw.canvas.width = ctx.canvas.width;
    ctx.putImageData(image_data,0,0);
    ctxdraw.putImageData(draw_data,0,0);
  }

  function remove_horizontal_seams() {
    if (!IMG_LOADED) return; // stops if an image isn't loaded.

    // get the image and rescale the canvas
    image_data = ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height);
    height = image_data.height;
    width = image_data.width;

    ctx.canvas.width = width;
    ctx.canvas.height = height;

    resizeCanvases(width,height);

    draw_data = ctxdraw.getImageData(0,0,ctxdraw.canvas.width,ctxdraw.canvas.height);

    // vertical gradient
    var grad = new Array(width)
    for (i = 0; i < width; i++){
      grad[i] = new Array(height)
    }

    // canvas pixels are one linear array. Each pixel is rgba so the total size is w*h*4
    nWidth = width*4;
    nHeight = height*4;

    // compute gradient map for the image
    for (y = 0; y < nHeight ; y+=4) {
      for (x = 0; x < nWidth; x+=4) {

        idx = x + y * width

        center_r = image_data.data[idx]
        center_g = image_data.data[idx+1]
        center_b = image_data.data[idx+2]
        center_a = image_data.data[idx+3]

        up = (y == 0 ? idx : (x + (y-4) * width))
        down = (y == nHeight-4 ? idx : (x + (y+4) * width))

        up_r = image_data.data[up]
        up_g = image_data.data[up+1]
        up_b = image_data.data[up+2]
        up_a = image_data.data[up+3]

        down_r = image_data.data[down]
        down_g = image_data.data[down+1]
        down_b = image_data.data[down+2]
        down_a = image_data.data[down+3]

        r = up_r - down_r;
        g = up_g - down_g;
        b = up_b - down_b;

        distance = Math.sqrt(r*r + g*g + b*b);

        draw_r = draw_data.data[idx]
        draw_g = draw_data.data[idx+1]
        draw_b = draw_data.data[idx+2]
        draw_a = draw_data.data[idx+3]
        color = (draw_r+draw_g+draw_b+draw_a)
        if (color > 0) {
          distance += GRAD_INCREASE
        }

        grad[x/4][y/4] = distance
      }
    }

    horizontal_fitness = grad.slice()

    for (x = 1; x < width; x++) {
      for (y = 0; y < height; y++) {
        horizontal_fitness[x][y] = grad[x][y]
        if (y == 0) {
          horizontal_fitness[x][y] += Math.min(horizontal_fitness[x-1][y], horizontal_fitness[x-1][y+1]);
        } else if (y == height-1) {
          horizontal_fitness[x][y] += Math.min(horizontal_fitness[x-1][y], horizontal_fitness[x-1][y-1]);
        } else {
          horizontal_fitness[x][y] += Math.min(horizontal_fitness[x-1][y], horizontal_fitness[x-1][y+1], horizontal_fitness[x-1][y-1]);
        }
      }
    }

    // Start the bottom of the image (where the total gradient sums are)
    // Traverses a path of pixels by moving to next minimum gradient.
    var best = 0
    for (var y = 0; y < height; y++) {
      best = (horizontal_fitness[width-1][y] < horizontal_fitness[width-1][best]) ? y : best
    }

    // Seam array contains the coordinates of the least cost seam
    seam = new Array()
    seam[0] = [x,best]

    for (x = width-1; x >= 0; x--) {
      left = (best == height-1) ? best : (best-1);
      right = (best == 0) ? best : (best+1);
      l = horizontal_fitness[x][left]
      r = horizontal_fitness[x][right]
      f = horizontal_fitness[x][best]
      best = (l < r) ? ( (l < f) ? left : best ) : (r < f ? right : best)
      seam.push([x,best])
    }

    for (x = 0; x<width; x++) {
      y_offset = 0;
      for (y = 0; y<height; y++) {
        if (seam[width-1-x][1] == y) y_offset = 1
        idx = (x*4 + y*4 * ctx.canvas.width)
        idx2 = (x*4 + (y+y_offset)*4 * ctx.canvas.width)
        image_data.data[idx] = image_data.data[idx2]
        image_data.data[idx+1] = image_data.data[idx2+1]
        image_data.data[idx+2] = image_data.data[idx2+2]
        image_data.data[idx+3] = image_data.data[idx2+3]

        // remove seam from drawing canvas
        draw_data.data[idx+0]=draw_data.data[idx2];
        draw_data.data[idx+1]=draw_data.data[idx2+1];
        draw_data.data[idx+2]=draw_data.data[idx2+2];
        draw_data.data[idx+3]=draw_data.data[idx2+3];
      }
    }

    ctx.canvas.height = ctx.canvas.height-1;
    ctxdraw.canvas.height = ctx.canvas.height
    ctx.putImageData(image_data,0,0);
    ctxdraw.putImageData(draw_data,0,0);
  }

}
