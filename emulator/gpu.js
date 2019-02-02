function GPU(mmu){
    
    this.mmu = mmu;
    
    this.LCDC = this.mmu.readGPU(0xFF40);
    this.STAT = this.mmu.readGPU(0xFF41);
    this.tileVramBankNumber = 0;
    this.LY = 0;//current scanline
    this.LYC = 0;//compare vertical line to scanline
    this.hblankCycles = 456;
    
    this.red = 0;
	this.green = 0;
	this.blue = 0;
    this.pixelData = [];
    this.offset = 0;
    this.maxPixels = 160*144*4;//height*width*rgba
}
GPU.prototype.doGraphics = function(cycles){
    
    this.LCDC = this.mmu.readGPU(0xFF40);
    this.LY = this.mmu.readGPU(0xFF44);
    this.STAT = this.mmu.readGPU(0xFF41);
    this.LYC = this.mmu.readGPU(0xFF45);
	if ((this.LCDC&(1<<7)?1:0) == false)
	{
		this.hblankCycles = 456;
		this.mmu.wram[0xFF44] = 0;

		// mode gets set to 0 when disabled screen.
		this.STAT &= 0b11111100;
		this.mmu.write(0xFF41,this.STAT);
		return;
	}

	var currentMode = this.STAT&0b11;

	var mode = 0;
	var reqvar = false;

	// set mode as vertical blank
	if (this.LY >= 144)
	{
		// mode 1
		mode = 1;
		this.STAT |= 1;
		this.STAT &= 0b11111101;
		reqvar = (this.STAT&(1<<4))? 1:0;
	}
	else
	{
		// mode 2
		if (this.hblankCycles >= 376)
		{
			mode = 2;
			this.STAT |= 0b10;
			this.STAT &= 0b11111110;
			reqvar = (this.STAT&(1<<5))? 1:0;
		}
		// mode 3
		else if (this.hblankCycles >= 204)
		{
			mode = 3;
			this.STAT |= 0b11;
		}
		// mode 0
		else
		{
			mode = 0;
			this.STAT &= 0b11111100;
			reqvar = (this.STAT&(1<<3))? 1:0;
		}

	}

	// just entered a new mode. Request varerupt
	if (reqvar && (currentMode != mode))
		this.mmu.write(0xFF0F, this.mmu.readGPU(0xFF0F)|0b00000010);

	// check for coincidence flag
	if (this.LY == this.LYC)
	{
		this.STAT |= 0b100;

		if (this.STAT&(1<<6))
		{
			this.mmu.write(0xFF0F, this.mmu.readGPU(0xFF0F)|0b00000010);
		}
	}
	else
	{
		this.STAT &= 0b11111011;
	}

	this.mmu.write(0xFF41, this.STAT);

	// count down the LY register which is the current line being drawn. When reaches 144 (0x90) its vertical blank time
	if (this.LCDC&0b10000000)
    {
		this.hblankCycles -= cycles;
    }
	if (this.mmu.wram[0xFF44] > 153)
		this.mmu.wram[0xFF44] = 0;
    
	if (this.hblankCycles <= 0)
	{
        this.mmu.wram[0xFF44]++;
        this.hblankCycles = 456;
        this.LY = this.mmu.readGPU(0xFF44);
        if ( this.LY == 144)
        {
            //issue V-Blank
            this.mmu.write(0xFF0F, this.mmu.readGPU(0xFF0F)|0b00000001);
        } 

        if (this.LY > 153)
            this.mmu.wram[0xFF44] = 0;
        if (this.LY < 144)
        {
            this.drawScanLine();
            this.renderSprites();
        }
    }	
}
GPU.prototype.drawScanLine = function(){
    
    // lets draw the background (however it does need to be enabled)
	if (this.LCDC&0b00000001)
	{
        //console.log("background is enabled");
		var tileData = 0;
		var backgroundMemory =0;
		var unsig = true;

		var scrollY = this.mmu.readGPU(0xFF42);
		var scrollX = this.mmu.readGPU(0xFF43);
		var windowY = this.mmu.readGPU(0xFF4A);
		var windowX = this.mmu.readGPU(0xFF4B) - 7;

		var usingWindow = false;

		if (this.LCDC&(1<<5))
		{
			if (windowY <= this.mmu.readGPU(0xFF44))
				usingWindow = true;
		}
		else
		{
			usingWindow = false;
		}

		// which tile data are we using?
		if (this.LCDC&(1<<4))
		{
			tileData = 0x8000;
		}
		else
		{
			tileData = 0x8800;
			unsig= false;
		}

		// which background mem?
		if (false == usingWindow)
		{
			if (this.LCDC&(1<<3))
				backgroundMemory = 0x9C00;
			else
				backgroundMemory = 0x9800;
		}
		else
		{
			if (this.LCDC&(1<<6))
				backgroundMemory = 0x9C00;
			else
				backgroundMemory = 0x9800;
		}


		var yPos = 0;

		if (!usingWindow)
			yPos = scrollY + this.mmu.readGPU(0xFF44);
		else
			yPos = this.mmu.readGPU(0xFF44) - windowY;

		var tileRow = ((yPos>>3)<<5)%1024;
		for (var pixel = 0; pixel < 160; pixel++)
		{
			var xPos = pixel+scrollX;

			if (usingWindow)
			{
				if (pixel >= windowX)
				{
					xPos = pixel - windowX;
				}
			}

			var tileCol = (xPos>>3)%1024;
			var tileNum;
            
            var BGMapAttributes = this.mmu.readGPU((backgroundMemory+tileRow + tileCol),1);
            this.tileVramBankNumber = BGMapAttributes&(1<<3) ? 1:0;
            if(this.mmu.inCGBMode)
            {
                if(unsig)
                    tileNum = this.mmu.readCGBGPU((backgroundMemory+tileRow + tileCol),this.tileVramBankNumber);
                else
                    tileNum = this.getSign(this.mmu.readCGBGPU((backgroundMemory+tileRow + tileCol),this.tileVramBankNumber));
            }
            else
            {
                if(unsig)
                    tileNum = this.mmu.readGPU(backgroundMemory+tileRow + tileCol);
                else
                    tileNum = this.getSign(this.mmu.readGPU(backgroundMemory+tileRow + tileCol));
            }
			var tileLocation = tileData;

			if (unsig)
				tileLocation += (tileNum << 4);
			else
				tileLocation += ((tileNum+128) << 4);
            
			var line = (yPos % 8)<<1;
			var data1;
			var data2;
            if(this.mmu.inCGBMode)
            {
                data1 = this.mmu.readCGBGPU((tileLocation + line),this.tileVramBankNumber);
                data2 = this.mmu.readCGBGPU((tileLocation + line + 1),this.tileVramBankNumber);
            }
            else
            {
                data1 = this.mmu.readGPU(tileLocation + line);
                data2 = this.mmu.readGPU(tileLocation + line + 1);
            }
			var colorBit = Math.abs((xPos % 8)-7);

			var colorNum = ((data2&(1<<colorBit)) ? 1:0) << 1;
			colorNum |= (data1&(1<<colorBit)) ? 1:0;

            if(this.mmu.inCGBMode)
            {
                var palette = (BGMapAttributes &(0x11100000)>>5);
                this.getCGBColor(colorNum, palette);
            }
            else
            {
                this.getColor(colorNum, 0xFF47);
            }
            
            this.pixelData[pixel*4+0+this.offset] = this.red;
            this.pixelData[pixel*4+1+this.offset] = this.green;
            this.pixelData[pixel*4+2+this.offset] = this.blue;
            this.pixelData[pixel*4+3+this.offset] = 255;//alpha transparancy
		}
        this.offset = this.LY*640;
	}
}
GPU.prototype.renderSprites = function(){
    
    //check if sprites are enabled
    if (this.LCDC&(1<<1))
	{
        var scanline = this.mmu.readGPU(0xFF44);
		
        for (var sprite = 0; sprite < 40; sprite++)
		{
 			var index = sprite*4;//offset
 			var yPos = this.mmu.readGPU(0xFE00+index) - 16;
 			var xPos = this.mmu.readGPU(0xFE00+index+1)-8;
 			var tileLocation = this.mmu.readGPU(0xFE00+index+2);
 			var attributes = this.mmu.readGPU(0xFE00+index+3);
            
            
            var pixelObscured = (attributes&(1<<7) ? 1:0);
			var yFlip = (attributes&(1<<6)) ? 1:0;
			var xFlip = (attributes&(1<<5)) ? 1:0;

			var ysize = 8;

			if (this.LCDC&(1<<2))
				ysize = 16;
 			if ((scanline >= yPos) && (scanline < (yPos+ysize)))
 			{
 				var line = scanline - yPos;
 				if (yFlip)
 				{
 					line -= ysize;
 				}

 				line = Math.abs(line<<1);
 				var data1;
 				var data2;
                if(this.mmu.inCGBMode)
                {
                    data1 = this.mmu.readCGBGPU(((0x8000 + (tileLocation << 4)) + line),this.tileVramBankNumber);
                    data2 = this.mmu.readCGBGPU(((0x8000 + (tileLocation << 4)) + line+1),this.tileVramBankNumber);
                }
                else
                {
                    data1 = this.mmu.readGPU( (0x8000 + (tileLocation << 4) + line));
 				    data2 = this.mmu.readGPU( (0x8000 + (tileLocation << 4) + line+1));
                }


 				for (var tilePixel = 0; tilePixel <= 7; tilePixel++)
 				{
					var colorBit = tilePixel;
 					if (xFlip)
 					{
 						colorBit = 7 - colorBit;
 					}
                    var colorNum = ((data2&(1<<colorBit)) ? 1:0) << 1;
                    colorNum |= (data1&(1<<colorBit)) ? 1:0;
                    var BGMapAttributes = this.mmu.readGPU((backgroundMemory+tileRow + tileCol),1);
                    
                    if(this.mmu.inCGBMode)
                    {
                        var palette = (BGMapAttributes &(0x11100000)>>5);
                        this.getCGBColor(colorNum, palette);
                    }
					else
                    {
                        this.getColor(colorNum, (attributes&(1<<4))?0xFF49:0xFF48);
                    }
                    
                    var xPix = 7 - tilePixel;
					var pixel = xPos+xPix;
                    ///*
                    var backgroundpixel = this.pixelData[pixel*4+3+((scanline-1)*640)]<<16|
                                          this.pixelData[pixel*4+1+((scanline-1)*640)]<<8|
                                          this.pixelData[pixel*4+2+((scanline-1)*640)];
                    if(backgroundpixel == 0xFFFFFF)
                        pixelObscured = 0;
                    //*/
 					// white is transparent for sprites
                    //also check if pixel is hidden behind background
 					if ((this.red==255&&this.green==255&&this.blue==255) || pixelObscured)
 						continue;
                    
                    this.pixelData[pixel*4+0+((scanline-1)*640)] = this.red;
                    this.pixelData[pixel*4+1+((scanline-1)*640)] = this.green;
                    this.pixelData[pixel*4+2+((scanline-1)*640)] = this.blue;
                    this.pixelData[pixel*4+3+((scanline-1)*640)] = 255;//alpha transparancy
 				
                }
 			}
		}
	}
    
}
GPU.prototype.getColor = function(colorNum, address){
	var palette = this.mmu.readGPU(address);
	var hi = 0;;
	var lo = 0;

	switch (colorNum)
	{
        case 0: hi = 1; lo = 0;break;
        case 1: hi = 3; lo = 2;break;
        case 2: hi = 5; lo = 4;break;
        case 3: hi = 7; lo = 6;break;
	}

	var color = 0;
	color = ((palette&(1<<hi)) ? 1:0) << 1;
	color |= palette&(1<<lo) ? 1:0;

	switch (color)
	{
        case 0: this.red = 255; this.green = 255; this.blue = 255;break;
        case 1: this.red = 0xCC; this.green = 0xCC; this.blue = 0xCC;break;
        case 2: this.red = 0x77; this.green = 0x77; this.blue = 0x77;break;
        case 3: this.red = 0; this.green = 0; this.blue = 0;break;
	}
}
GPU.prototype.getCGBColor = function(colorNum, palette){
    
    var colorByte1 = this.mmu.cgbColor[palette*8 + colorNum*2];
    var colorByte2 = this.mmu.cgbColor[palette*8 + colorNum*2 +1];
    var color = colorByte1 << 8 | colorByte2;
	this.red   = color & 0b1111100000000000;
    this.green = color & 0b0000011111000000;
    this.black = color & 0b0000000000111110;

}
GPU.prototype.getSign = function(value){
    return (value&0b01111111)-(value&0b10000000);
}