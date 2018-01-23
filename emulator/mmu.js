function MMU(controller) {
    
    this.joyPad = controller;
    
    this.rom = [];
    this.cartridgeRAM = [];
    this.wram = [];
    
    this.currentROMBank = 1;
    this.previousRAMBank = 0;
    this.numRAMBanks = 0;
    this.numROMBanks = 0;
    this.romBankingMode = true;
    this.enableRamBank = false;
    this.MBC1 = false;
    this.MBC2 = false;
    this.MBC3 = false;
    this.MBC5 = false;
    this.RTC_reg = [0,0,0,0,0];//8-RTC S, 9-RTC M, A-RTC H, B-RTC DL, C-RTC DH
    this.RTC_Index = -1;//currently off
    this.RTC_latch = false;
    this.RTC_startLatch = false;
    this.reset();
    
    //debu
    this.debugInfo = "";
    this.serial;
    this.i = 0;
    
    //timer
    this.updatedClockSpeed = false;
    this.clocksToUpdateDIV = 0;
    this.clocksToUpdateTIMA = 0;
}
MMU.prototype.readGPU = function(index){
    
    return this.wram[index];
}
MMU.prototype.read = function(index){
    
    ///*
    if(index>=0 && index<=0x3FFF)
    {
        if(this.romBankingMode==false)
        {
            var bank = this.currentROMBank&0b01100000;
            return this.rom[bank*0x4000];
        } 
        return this.rom[index];
    }
    //*/
    if(index>=0x4000 && index<=0x7FFF)
    {
        if(this.romBankingMode==false)
            return this.rom[index];
        var address = (this.currentROMBank-1)*0x4000+index;
        return this.rom[address];
    }
    //reading from video ram
    else if(index>=0x8000&&index<=0x9FFF)
    {
        var stat = this.wram[0xFF41];
        //if in mode 3 CPU can not read from VRAM
        if((stat&0b11) == 3)
        {
            //if trying to read, return 0xFF
            return 0xFF;
        }
        return this.wram[index];
    }
    else if(index>=0xA000 && index <=0xBFFF)
    {
        if(this.enableRamBank==true)
        {
            if(this.MBC1)
            {
                var address = index - 0xA000;
                if(this.romBankingMode==true)
                    return this.cartridgeRAM[0][address];
                else
                {
                    if(this.previousRAMBank>this.numRAMBanks-1)
                        return 0xFF;
                    return this.cartridgeRAM[this.previousRAMBank][address];
                }
            }
            else if(this.MBC3)
            {
                if(this.RTC_Index<0)
                {
                    var address = index- 0xA000;
                    return this.cartridgeRAM[this.previousRAMBank][address];
                }
                else
                {
                    if(this.RTC_latch == false)
                    {
                        //if RTC not latched, can change value
                        return this.RTC_reg[this.RTC_Index];
                    }
                }
            }
        }
        else
            return 0xFF;
    }
	//read from OAM
    else if(index>=0xFE00 && index<=0xFE9F)
    {
        var stat = this.wram[0xFF41];
        //if in mode 2 or 3 can not read from OAM
        if( ((stat&0b11) == 3) || ((stat&0b11) == 2))
        {
            //reads will return 0xFF
            return 0xFF;
        }
        return this.wram[index];
    }
	else if (index == 0xFF00)
		return this.joyPadState();

	return this.wram[index];
}
MMU.prototype.write = function(index, value){
    
    if (index <= 0x1FFF)
	{
	    if (this.MBC1||this.MBC3||this.MBC5)
	    {
            if ((value & 0xF) == 0xA)
                this.enableRamBank = true ;
            else
                this.enableRamBank = false ;
	    }
	    else if (this.MBC2)
	    {
            //bit 0 of upper byte must be 0
            if (false == (index&(1<<8) ? 1:0))
            {
                if ((value & 0xF) == 0xA)
                    this.enableRamBank = true ;
                else
                    this.enableRamBank = false ;
            }
	    }
	}

	// if writing to a index index between 2000 and 3FFF then we need to change rom bank
	else if ( (index >= 0x2000) && (index <= 0x3FFF) )
	{
		if (this.MBC1)
		{
            //console.log("value: "+value.toString(2));
            value &= 0b00011111;
			// Turn off the lower 5-bits.
			this.currentROMBank &= 0b01100000;
            if(this.romBankingMode==true)
            {
                // Combine the written value with the register.
                this.currentROMBank |= value;
            }
            else
                this.currentROMBank = value;

            this.currentROMBank &= this.numROMBanks-1;
            //console.log("0x2000 "+this.currentROMBank);
		}
		else if (this.MBC2)
		{
            var upperValue = value>>4;
            if(upperValue&1)
            {
                this.currentROMBank = (value&0x0F);
            }
		}
        else if (this.MBC3)
        {
            if(value==0)
                value++;
            this.currentROMBank = value&0b01111111;
        }
        else if(this.MBC5)
        {
            if(index<=0x2FFF)
                this.currentROMBank = value;
            else
                this.currentROMBank |= ((value&1)<<9);//9th bit of rom bank
        }
	}

	// writing to index 0x4000 to 0x5FFF switches ram banks (if enabled of course)
	else if ( (index >= 0x4000) && (index <= 0x5FFF))
	{
		if (this.MBC1)
		{
            ///*
			// are we using rom bank mode
			if (this.romBankingMode)
			{
                //console.log("value: "+value.toString(2));
				value &= 0b11;
				value <<= 5;
                
				// Turn off bits 5 and 6, and 7 if it somehow got turned on.
				this.currentROMBank &= 0b00011111;
                
                // Combine the written value with the register.
				this.currentROMBank |= value;
                
				if (this.currentROMBank==0||this.currentROMBank==20||this.currentROMBank==40||this.currentROMBank==60)
				{
					this.currentROMBank++;
				}

                //make sure value doesn't exceed existing rom banks
                this.currentROMBank &= this.numROMBanks-1;
                //console.log("0x4000 "+this.currentROMBank);
                //console.log("i: "+ (++this.i)%8);
			}
            //*/
			else
			{
                if(this.numRAMBanks>15)
                    this.previousRAMBank = value&0xF;
                else if(this.numRAMBanks>3)
                    this.previousRAMBank = value&0x3;
			}
		}
        else if (this.MBC3)
        {
            if(value>=0 && value<=3)
            {
                this.previousRAMBank = value;
                this.RTC_Index = -1;//turn off RTC register reading and writing
            }
            else if(value>=0x8 && value<=0xC)
            {
                this.RTC_Index = value - 8;
            }
        }
        else if (this.MBC5)
        {
            this.previousRAMBank = value&0xF;
        }
	}

	// writing to index 0x6000 to 0x7FFF switches index model
	else if ( (index >= 0x6000) && (index <= 0x7FFF))
	{
		if (this.MBC1)
		{
			// we're only interested in the first bit
			value &= 1 ;
			if (value == 1)
			{
				this.romBankingMode = false ;
			}
			else
				this.romBankingMode = true ;
		}
        if (this.MBC3)
        {
            if(value==0)
            {
                this.RTC_startLatch = true;
            }
            else if(this.RTC_startLatch == true)
            {
                if(this.RTC_latch&&value==1)
                    this.RTC_latch = false;//if latched then unlatch
                else if(!this.RTC_latch&&value==1)//if unlatched then latch
                    this.RTC_latch = true;
                this.RTC_startLatch = false;//start over if success or failure
            }
        }
	}
    //writing to video ram
    else if(index>=0x8000&&index<=0x9FFF)
    {
        var stat = this.wram[0xFF41];
        //if in mode 3 CPU can not write to VRAM
        if((stat&0b11)==3)
        {
            //if trying to write, return
            return;
        }
        this.wram[index] = value;
    }
    else if(index >= 0xA000 && index <= 0xBFFF)
    {
        if(this.enableRamBank)
        {
            if(this.MBC1)
            {
                var address = index- 0xA000;
                if(this.romBankingMode==true)
                    this.cartridgeRAM[0][address] = value;
                else
                {
                    if(this.previousRAMBank > this.numRAMBanks-1)
                        return;
                    this.cartridgeRAM[this.previousRAMBank][address] = value;
                }
            }
            if(this.MBC3)
            {
                if(this.RTC_Index<0)
                {
                    var address = index- 0xA000;
                    this.cartridgeRAM[this.previousRAMBank][address] = value;
                }
                else
                {
                    if(this.RTC_latch == false)
                    {
                        //if RTC not latched, can change value
                        this.RTC_reg[this.RTC_Index] = value;
                    }
                }
            }
        }
    }
	// echo index. Writes here and into the internal ram. Same as above
	else if ( (index >= 0xE000) && (index <= 0xFDFF) )
	{
		this.wram[index] = value ;
		this.wram[index -0x2000] = value ; // echo value into ram index
	}
    //write to OAM
    else if(index>=0xFE00 && index<=0xFE9F)
    {
        var stat = this.wram[0xFF41];
        //if in mode 3 can not write to OAM unless through 0xFF46
        if((stat&0b11)==3)
        {
            //if trying to write, return
            return;
        }
        this.wram[index] = value;
    }
	// This area is restricted.
 	else if ((index >= 0xFEA0) && (index <= 0xFEFF))
 	{
        return;
 	}
	// reset the divider register
	else if (index == 0xFF04)
	{
		this.wram[0xFF04] = 0;
        this.clocksToUpdateDIV = 0;
	}
    else if (index == 0xFF07)
	{
		this.wram[0xFF07] = value ;

		var inputClockSelect = value & 0b011 ;

		var clockSpeed = 0 ;

		switch(inputClockSelect)
		{
			case 0: clockSpeed = 1024 ; break ;
			case 1: clockSpeed = 16; break ;
			case 2: clockSpeed = 64 ;break ;
			case 3: clockSpeed = 256 ;break ;
		}

		if (clockSpeed != this.clocksToUpdateTIMA)
		{
			this.clocksToUpdateTIMA = clockSpeed ;
            this.updatedClockSpeed = true;
		}
	} 
	// FF44 shows which horizontal scanline is currently being draw. Writing here resets it
	else if (index == 0xFF44)
	{
		this.wram[0xFF44] = 0;
	}
	else if (index == 0xFF45)
	{
		this.wram[index] = value ;
	}
	// DMA transfer
	else if (index == 0xFF46)
	{
	    var newindex = (value << 8) ;
		for (var i = 0; i < 0xA0; i++)
		{
			this.wram[0xFE00 + i] = this.wram[newindex+i];
		}
	}
	// This area is restricted.
 	else if ((index >= 0xFF4C) && (index <= 0xFF7F))
 	{
 	}
	else
	{
		this.wram[index] = value ;
	}
}
MMU.prototype.loadROM = function(romText){
    
    this.rom = new Uint8Array(romText);
    for(var i=0;i<0x7FFF;i++)
    {
        this.wram[i] = this.rom[i];
    }
}
MMU.prototype.setup = function(){
    
    var cartridgeType = this.rom[0x147];
    console.log("cartridge "+cartridgeType);
    switch(cartridgeType)
    {
        case 0x0:
            break;
        case 0x1:
        case 0x2:
        case 0x3:
            this.MBC1 = true;
            break;
        case 0x5:
        case 0x6:
            this.MBC2 = true;
            break;
        case 0xF:
        case 0x10:
        case 0x11:
        case 0x12:
        case 0x13:
            this.MBC3 = true;
            break;
        case 0x19:
        case 0x1A:
        case 0x1B:
        case 0x1C:
        case 0x1D:
        case 0x1E:
            this.MBC5 = true;
            break;
    }
    var numRamBanks = this.rom[0x149];
    switch(numRamBanks)
    {
        case 0:
            this.numRAMBanks = (this.MBC2==true) ? 1:0;
            break;
        case 1:
        case 2:
            this.numRAMBanks = 1;
            break;
        case 4:
            this.numRAMBanks = 16;
            break;
        default:
            this.numRAMBanks = 4;
            break;
    }
    for(var i=0; i<this.numRAMBanks; i++)
    {
        this.cartridgeRAM[i] = [];
        for(var j = 0;j<0x2000;j++)
        {
            this.cartridgeRAM[i][j] = 0xFF;//create 16 RAM bank arrays
        }
    }
    console.log(this.numRAMBanks);
    var romsize = this.rom[0x148];
    switch(romsize)
    {
        case 0x0:
            break;
        case 0x1:
            this.numROMBanks = 4;
            break;
        case 0x2:
            this.numROMBanks = 8;
            break;
        case 0x3:
            this.numROMBanks = 16;
            break;
        case 0x4:
            this.numROMBanks = 32;
            break;
        case 0x5:
            this.numROMBanks = 64;
            break;
        case 0x6:
            this.numROMBanks = 128;
            break;
        case 0x7:
            this.numROMBanks = 256;
            break;
        case 0x52:
            this.numROMBanks = 72;
            break;
        case 0x53:
            this.numROMBanks = 80;
            break;
        case 0x54:
            this.numROMBanks = 96;
            break;
    }
    console.log("rom banks: "+ this.numROMBanks);
}
MMU.prototype.joyPadState = function(){
    
    var status = this.wram[0xFF00];
    //when programmer selects interested bit input is 1
    //pressed values are read low(0's) unpressed values are read high(1's)
    //it must be xored to get real values
    status ^= 0xFF;
    var selectButton = status&(1<<5) ? 1:0;
    var selectDirection = status&(1<<4) ? 1:0;
    
    if(!selectDirection)
    {
        var topJoypad = this.joyPad.joyPadState >> 4 ;
		topJoypad |= 0xF0 ;
		status &= topJoypad ;
    }
    else if(!selectButton)
    {
        var bottomJoypad = this.joyPad.joyPadState & 0xF ;
		bottomJoypad |= 0xF0 ;
		status &= bottomJoypad ;
    }
    
    return status;
    
}//not done
MMU.prototype.reset = function(){
    
    for(var i=0; i<0xFFFF; i++)
    {
        this.wram[i] = 0x00;
    }
    this.wram[0xFF05] = 0x00;//TIMA
    this.wram[0xFF06] = 0x00;//TMA
    this.wram[0xFF07] = 0x00;//TAC
    this.wram[0xFF10] = 0x80;//NR10
    this.wram[0xFF11] = 0xBF;
    this.wram[0xFF12] = 0xF3;
    this.wram[0xFF14] = 0xBF;
    this.wram[0xFF16] = 0x3F;
    this.wram[0xFF17] = 0x00;
    this.wram[0xFF19] = 0xBF;
    this.wram[0xFF1A] = 0x7F;
    this.wram[0xFF1B] = 0xFF;
    this.wram[0xFF1C] = 0x9F;
    this.wram[0xFF1E] = 0xBF;
    this.wram[0xFF20] = 0xFF;
    this.wram[0xFF21] = 0x00;
    this.wram[0xFF22] = 0x00;
    this.wram[0xFF23] = 0xBF;
    this.wram[0xFF24] = 0x77;
    this.wram[0xFF25] = 0xF3;
    this.wram[0xFF26] = 0xF1;
    //this.wram[0xFF26] = 0xF0;
    this.wram[0xFF40] = 0x91;
    this.wram[0xFF41] = 0x81;
    this.wram[0xFF42] = 0x00;
    this.wram[0xFF43] = 0x00;
    this.wram[0xFF45] = 0x00;
    this.wram[0xFF47] = 0xFC;
    this.wram[0xFF48] = 0xFF;
    this.wram[0xFF49] = 0xFF;
    this.wram[0xFF4A] = 0x00;
    this.wram[0xFF4B] = 0x00;
    this.wram[0xFFFF] = 0x00;
}