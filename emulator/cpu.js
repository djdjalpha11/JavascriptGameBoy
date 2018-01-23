function CPU(MMU) {
    
    this.mmu = MMU;
    
    //this.AF_reg = 0x01B0;
    this.AF_reg = 0x1180;
    //this.BC_reg = 0x0013;
    this.BC_reg = 0x0000;
    //this.DE_reg = 0x00D8;
    this.DE_reg = 0xFF56;
    this.HL_reg = 0x014D;
    
    //this.A_reg = 0x01;
    this.A_reg = 0x11;
    //this.F_reg = 0xB0;
    this.F_reg = 0x80;
    this.B_reg = 0x00;
    //this.C_reg = 0x13;
    this.C_reg = 0x00;
    //this.D_reg = 0x00;
    this.D_reg = 0xFF;
    //this.E_reg = 0xD8;
    this.E_reg = 0x56;
    this.H_reg = 0x01;
    this.L_reg = 0x4D;
    
    this.SP_reg = 0xFFFF;
    this.PC_reg = 0x100;
    
    //interrupts
    this.enabled = false;
    this.pendDisabled = false;
    this.pendEnabled = false;
    this.halt = false;
    this.haltbug = false;
    //this.reset();
}
CPU.prototype.reset = function(){
    
    this.AF_reg = 0x01B0;
    this.BC_reg = 0x0013;
    this.DE_reg = 0x00D8;
    this.HL_reg = 0x014D;
    
    this.A_reg = 0x01;
    this.F_reg = 0xB0;
    this.B_reg = 0x00;
    this.C_reg = 0x13;
    this.D_reg = 0x00;
    this.E_reg = 0xD8;
    this.H_reg = 0x01;
    this.L_reg = 0x4D;
    
    this.SP_reg = 0xFFFE;
    this.PC_reg = 0x100;
    
        //interrupts
    this.enabled = false;
    this.pendDisabled = false;
    this.pendEnabled = false;
}
CPU.prototype.getSign = function(value){
    
    return (value&0b01111111)-(value&0b10000000);
}
CPU.prototype.push = function(value){
    
    var hi = value>>8;
    var lo = value&0XFF;
    this.SP_reg--;
    this.mmu.write(this.SP_reg, hi);
    this.SP_reg--;
    this.mmu.write(this.SP_reg, lo);
    this.PC_reg++;
}
CPU.prototype.pop = function(){
    
    var hi = this.mmu.read(this.SP_reg+1);
    var lo = this.mmu.read(this.SP_reg);
    this.SP_reg += 2;
    this.PC_reg++;
    return ((hi<<8)|lo);
}
CPU.prototype.readWord = function(){
    
    var hi = this.mmu.read(this.PC_reg+2);
    var lo = this.mmu.read(this.PC_reg+1);
    this.PC_reg += 3;
    var address = (hi<<8)|lo;
    return address;
}
CPU.prototype.jumpWord = function(condition, value){
 
    var address = this.readWord();
    if(condition==2)
    {
        this.PC_reg = address;
    }
    else if(condition == value)
    {
        this.PC_reg = address; 
    }
}
CPU.prototype.jumpByte = function(condition, value){

    var address = this.getSign(this.mmu.read(this.PC_reg+1));
    this.PC_reg++;
    if(condition==2)
    {
        this.PC_reg += address;
    }
    else if(condition == value)
    {
        this.PC_reg += address; 
    }
    this.PC_reg++;
}
CPU.prototype.call = function(condition, value){
    

    var address = this.readWord();
    if(condition == 2)
    {    
        this.push(this.PC_reg);
        this.PC_reg = address;
    }
    else if(condition == value)
    {    
        this.push(this.PC_reg);
        this.PC_reg = address;
    }
}
CPU.prototype.restart = function(value){
    
    this.PC_reg++;//check
    this.push(this.PC_reg);
    this.PC_reg = value;
}
CPU.prototype.return = function(condition, value){
    
    var address;
    if(condition == 2)
    {    
        address = this.pop();
        this.PC_reg = address;
    }
    else if(condition == value)
    {    
        address = this.pop();
        this.PC_reg = address;
    }
    else
        this.PC_reg++;
}
CPU.prototype.swap = function(reg){
    
    this.F_reg = 0;
    var hi = reg>>4;
    var lo = reg&0x0F;
    var swapped = ((lo<<4)|hi)&0xFF;
    if(swapped==0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
    return swapped;
}
CPU.prototype.testBit = function(reg, bit){
    
    var mask = 1<<bit;
    this.F_reg |= 0b00100000;
    this.F_reg &= 0b10110000;
    if(((reg&mask)?1:0)==0)
        this.F_reg |= 0b10000000;
    else
        this.F_reg &= 0b01110000;
    this.PC_reg++;
}
CPU.prototype.setBit = function(reg, bit){
    
    reg |= (1<<bit);
    this.PC_reg++;
    return reg;
}
CPU.prototype.resetBit = function(reg, bit){
    
    reg &= ~(1<<bit);
    this.PC_reg++;
    return reg;
}
CPU.prototype.rrc = function(reg){
    
    this.F_reg = (reg&1)<<4;//c flag
    reg = (reg>>1) | (reg<<7);
    if((reg&0xFF)==0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
    return reg&0xFF;
}
CPU.prototype.sla = function(reg){
    
    this.F_reg = (reg&0b10000000)>>3;//c flag
    reg <<= 1;
    if((reg&0xFF)==0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
    return reg&0xFF;
}
CPU.prototype.sra = function(reg){
    
    this.F_reg = (reg&1) << 4;//c flag
    reg = (reg&0b10000000)|(reg>>1);
    if((reg&0xFF)==0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
    return reg&0xFF;
}
CPU.prototype.rl = function(reg){
    
    var isCarry = (this.F_reg&0b00010000)>>4;
    this.F_reg = (reg&0b10000000)>>3;
    reg = (reg<<1)|isCarry;
    if((reg&0xFF)==0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
    return reg&0xFF;
}
CPU.prototype.rr = function(reg){
    var carry = this.F_reg&0b00010000?1:0;
	this.F_reg = (reg&1) << 4;//c flag
    
    reg = (reg>>1)|(carry<<7);
    if((reg&0xFF) == 0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
    return reg&0xFF;
}
CPU.prototype.rlc = function(reg){
    
    reg = (reg<<1)|(reg>>7);
	this.F_reg = (reg&1)<<4;//c flag

	if ((reg&0xFF)==0)
		this.F_reg |= 0b10000000;
    this.PC_reg++;
    return reg&0xFF;
}
CPU.prototype.srl = function(reg){
    
    this.F_reg = (reg&1)<<4;//c flag
    reg >>= 1;
    reg &= 0b01111111;
    if((reg&0xFF)==0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
    return reg&0xFF;
}
CPU.prototype.add = function(value){
    
    this.F_reg = 0;

    if(((this.A_reg+value)&0x100)==0x100)
        this.F_reg |= 0b00010000;
    if((((this.A_reg&0x0F)+(value&0x0F))&0x10)==0x10)
        this.F_reg |= 0b00100000;
    this.A_reg += value;
    this.A_reg &= 0xFF;
    if((this.A_reg&0xFF)==0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
}
CPU.prototype.addC = function(value){
    
    var isCarry = this.F_reg&0b00010000?1:0;
    this.F_reg = 0;

    if((((this.A_reg&0x0F)+((value)&0x0F)+isCarry))>0x0F)
        this.F_reg |= 0b00100000;
    if(((this.A_reg+value+isCarry)&0x100)>0xFF)
        this.F_reg |= 0b00010000;
    this.A_reg += value+isCarry;
    this.A_reg &= 0xFF;//excluding line makes sub work
    if((this.A_reg&0xFF)==0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
}//excluding add or sub makes display work
CPU.prototype.sub = function(value){
    
    this.F_reg = 0b01000000;
    if((this.A_reg-value) < 0)
        this.F_reg |= 0b00010000;
    if(((this.A_reg&0x0F)-((value)&0x0F)) < 0)
        this.F_reg |= 0b00100000;
    this.A_reg -= value;
    this.A_reg &= 0xFF;
    if((this.A_reg&0xFF)==0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
}//faulty function no image display
CPU.prototype.subC = function(value){
    
    var isCarry = this.F_reg&0b00010000?1:0;
    this.F_reg = 0b01000000;
    if(((this.A_reg&0x0F)-(value&0x0F)-isCarry) < 0)
        this.F_reg |= 0b00100000;
    if(isCarry)
        value += 1;
    if((this.A_reg-value) < 0)
        this.F_reg |= 0b00010000;
    this.A_reg -= value;
    this.A_reg &= 0xFF;
    if((this.A_reg&0xFF)==0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
}
CPU.prototype.ALU8 = function(value,type){
    
    this.F_reg = 0;
    switch(type)
    {
        case 0://and
            this.A_reg &= value;
            this.F_reg = 0b00100000;
            break;
        case 1://or
            this.A_reg |= value;
            break;
        case 2://xor
            this.A_reg ^= value;
            break;
    }
    this.A_reg &= 0xFF;
    if(this.A_reg==0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
}
CPU.prototype.ALU16 = function(reg, value){
    
    var temp = reg + value;
    this.F_reg &= 0b10000000;//z
    if ((temp & 0x10000) == 0x10000)
        this.F_reg |= 0b00010000;//c
    this.F_reg |= (0b00100000 & ((reg ^ value ^ (temp & 0xFFFF)) >> 7));//h
    this.PC_reg++;
    return temp&0xFFFF;
}
CPU.prototype.addSP = function(value){
    
    var temp = this.SP_reg + value;
    this.F_reg = 0;
    if(((this.SP_reg&0xFF)+(value&0xFF)&0x100)==0x100)
        this.F_reg |= 0b00010000;
    if(((this.SP_reg&0x0F)+(value&0x0F)&0x10)==0x10)
        this.F_reg |= 0b00100000;
    this.PC_reg++;
    return temp&0xFFFF;
}
CPU.prototype.increment16 = function(value){
    value++;
    this.PC_reg++;
    return value&0xFFFF;
}
CPU.prototype.decrement16 = function(value){
    value--;
    this.PC_reg++;
    return value&0xFFFF;
}
CPU.prototype.compare = function(value){
    
    this.F_reg = 0;
    this.F_reg |= 0b01000000;
    if(this.A_reg == value)
        this.F_reg |= 0b10000000;
    //half carry no borrow
    if((this.A_reg&0x0F)<(value&0x0F))
        this.F_reg |= 0b00100000;
    //carry no borrow
    if(this.A_reg<value)
        this.F_reg |= 0b00010000;
    this.PC_reg++;
}
CPU.prototype.writeToHL = function(value){
    this.HL_reg = this.H_reg<<8|this.L_reg;
    this.mmu.write(this.HL_reg, value);
    this.PC_reg++;
}
CPU.prototype.increment8 = function(reg){
    
    reg = (reg+1)&0xFF;
    this.F_reg &= 0b00010000;
    if(((reg)&0x0F) == 0)
        this.F_reg |= 0b00100000;
    if(reg==0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
    return reg;
}
CPU.prototype.decrement8 = function(reg){
    
    reg = (reg-1)&0xFF;
    this.F_reg &= 0b00010000;
    this.F_reg |= 0b01000000;
    if(((reg)&0x0F) == 0x0F)
        this.F_reg |= 0b00100000;
    if(reg==0)
        this.F_reg |= 0b10000000;
    this.PC_reg++;
    return reg;
}
CPU.prototype.handleInterrupts = function(){
    
    if(this.enabled){
        var req = this.mmu.read(0xFF0F);
        if(req>0)
        {
            for(var i=0;i<5;i++)
            {
                if( (req&(1<<i)) ? 1 : 0)
                {
                    var enabledreq = this.mmu.read(0xFFFF);
                    if(enabledreq&(1<<i) ? 1 : 0)
                    {
                        this.halt = false;//if IME = 1 and ((IE & IF) !=0)
                        this.push(this.PC_reg);
                        switch(i)
                        {
                            case 0://V-blank
                                this.PC_reg = 0x40;
                                break;
                            case 1://LCD stat
                                this.PC_reg = 0x48;
                                break;
                            case 2://Timer
                                this.PC_reg = 0x50;
                                break;
                            case 3://serial
                                this.PC_reg = 0x58;
                                break;
                            case 4://JoyPad
                                this.PC_reg = 0x60;
                                break;
                        }
                        this.enabled = false;
                        this.mmu.wram[0xFF0F] = req&(~(1<<i));
                        return 20;
                    }
                }
            }
        }
    }
    return 0;
}
CPU.prototype.interruptSwitching = function() {
    
    if (this.pendDisabled)
    {
        this.pendDisabled = false ;
        this.enabled = false ;
        /*only has delay in CGB mode
        if (this.mmu.read(this.PC_reg-1) != 0xF3)
        {
            this.pendDisabled = false ;
            this.enabled = false ;
        }
        //*/
    }

    if (this.pendEnabled)
    {
        if (this.mmu.read(this.PC_reg-1) != 0xFB)
        {
            this.pendEnabled = false ;
            this.enabled = true ;
        }
    }

}
CPU.prototype.checkHalt = function(){
    
    var req = this.mmu.read(0xFF0F);
    var enabledreq = this.mmu.read(0xFFFF);
    if(this.enabled == 0)
    {
        if((req&enabledreq)!=0)
        {
            this.halt = false;// if IME = 0 and (IF) is set during halt (IE&IF != 0)
        }
    }
}
CPU.prototype.executeOpCode = function(instruction){
    
    ///*
    if(this.halt)
    {
        return 4;
    }
    if(this.haltbug)
    {
        //PC_reg fails to update so instruction after halt executes twice
        if((this.PC_reg-1)!=0x76)
        {
            this.haltbug = false;
            this.PC_reg--;
        }
    }
    //*/
    switch(instruction)
    {
        //NOP
        case 0x00:
            this.PC_reg++;
            return 4;
        //jumps
        case 0xC3:
            this.jumpWord(2,-1);
            return 16;
        case 0xC2:
            this.jumpWord( ( (this.F_reg&(1<<7) ) ? 1 : 0) ,0);
            if(((this.F_reg&(1<<7) ) ? 1 : 0) == 0 )
                return 16;//on branch success
            return 12;
        case 0xCA:
            this.jumpWord(((this.F_reg&(1<<7)) ? 1 : 0),1);
            if(((this.F_reg&(1<<7) ) ? 1 : 0) == 1 )
                return 16;//on branch success
            return 12;
        case 0xD2:
            this.jumpWord(((this.F_reg&(1<<4)) ? 1 : 0),0);
            if(((this.F_reg&(1<<4) ) ? 1 : 0) == 0 )
                return 16;//on branch success
            return 12;
        case 0xDA:
            this.jumpWord(((this.F_reg&(1<<4)) ? 1 : 0),1);
            if(((this.F_reg&(1<<4) ) ? 1 : 0) == 1 )
                return 16;//on branch success
            return 12;
        case 0xE9:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.PC_reg = this.HL_reg;
            return 4;
        case 0x18:
            this.jumpByte(2,-1);
            return 12;
        case 0x20:
            this.jumpByte(((this.F_reg&(1<<7)) ? 1 : 0),0);
            if(((this.F_reg&(1<<7) ) ? 1 : 0) == 0 )
                return 12;//on branch success
            return 8;
        case 0x28:
            this.jumpByte(((this.F_reg&(1<<7)) ? 1 : 0),1);
            if(((this.F_reg&(1<<7) ) ? 1 : 0) == 1 )
                return 12;//on branch success
            return 8;
        case 0x30:
            this.jumpByte(((this.F_reg&(1<<4)) ? 1 : 0),0);
            if(((this.F_reg&(1<<4) ) ? 1 : 0) == 0 )
                return 12;//on branch success
            return 8;;
        case 0x38:
            this.jumpByte(((this.F_reg&(1<<4)) ? 1 : 0),1);
            if(((this.F_reg&(1<<4) ) ? 1 : 0) == 1 )
                return 12;//on branch success
            return 8;
        //call
        case 0xCD:
            this.call(2,-1);
            return 24;
        case 0xC4:
            this.call(((this.F_reg&(1<<7)) ? 1 : 0),0);
            if(((this.F_reg&(1<<7) ) ? 1 : 0) == 0 )
                return 24;//on branch success
            return 12;
        case 0xCC:
            this.call(((this.F_reg&(1<<7)) ? 1 : 0),1);
            if(((this.F_reg&(1<<7) ) ? 1 : 0) == 1 )
                return 24;//on branch success
            return 12;
        case 0xD4:
            this.call(((this.F_reg&(1<<4)) ? 1 : 0),0);
            if(((this.F_reg&(1<<4) ) ? 1 : 0) == 0 )
                return 24;//on branch success
            return 12;
        case 0xDC:
            this.call(((this.F_reg&(1<<4)) ? 1 : 0),1);
            if(((this.F_reg&(1<<4) ) ? 1 : 0) == 1 )
                return 24;//on branch success
            return 12;
        //restart
        case 0xC7:
            this.restart(0x00);
            return 16;
        case 0xCF:
            this.restart(0x08);
            return 16;
        case 0xD7:
            this.restart(0x10);
            return 16;
        case 0xDF:
            this.restart(0x18);
            return 16;
        case 0xE7:
            this.restart(0x20);
            return 16;
        case 0xEF:
            this.restart(0x28);
            return 16;
        case 0xF7:
            this.restart(0x30);
            return 16;
        case 0xFF:
            this.restart(0x38);
            return 16;
        //return
        case 0xC9:
            this.return(2,-1);
            return 16;
        case 0xC0:
            this.return(((this.F_reg&(1<<7)) ? 1 : 0),0);
            if(((this.F_reg&(1<<7) ) ? 1 : 0) == 0 )
                return 20;//on branch success
            return 8;
        case 0xC8:
            this.return(((this.F_reg&(1<<7)) ? 1 : 0),1);
            if(((this.F_reg&(1<<7) ) ? 1 : 0) == 1 )
                return 20;//on branch success
            return 8;
        case 0xD0:
            this.return(((this.F_reg&(1<<4)) ? 1 : 0),0);
            if(((this.F_reg&(1<<4) ) ? 1 : 0) == 0 )
                return 20;//on branch success
            return 8;
        case 0xD8:
            this.return(((this.F_reg&(1<<4)) ? 1 : 0),1);
            if(((this.F_reg&(1<<4) ) ? 1 : 0) == 1 )
                return 20;//on branch success
            return 8;
        //reti
        case 0xD9:
            this.return(2,-1);
            this.pendEnabled = true;
            return 16;
        //16 bit loads
        case 0x01:
            this.BC_reg = this.readWord();
            this.B_reg = this.BC_reg>>8;
            this.C_reg = this.BC_reg&0xFF;
            return 12;
        case 0x11:
            this.DE_reg = this.readWord();
            this.D_reg = this.DE_reg>>8;
            this.E_reg = this.DE_reg&0xFF;
            return 12;
        case 0x21:
            this.HL_reg = this.readWord();
            this.H_reg = this.HL_reg>>8;
            this.L_reg = this.HL_reg&0xFF;
            return 12;
        case 0x31:
            this.SP_reg = this.readWord();
            return 12;
        case 0x08://check
            var address = this.readWord();
            //lo then hi
            this.mmu.write(address, (this.SP_reg&0xFF));//sp reg initially not shifted
            this.mmu.write((address+1),(this.SP_reg>>8));//added line
            return 20;
        case 0xF9:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.SP_reg = this.HL_reg;
            this.PC_reg++;
            return 8;
        case 0xF8:
            var value = this.getSign(this.mmu.read(this.PC_reg+1));
            this.HL_reg = this.addSP(value);
            this.H_reg = this.HL_reg>>8;
            this.L_reg = this.HL_reg&0xFF;
            this.PC_reg++;
            return 12;
        //push
        case 0xF5:
            this.AF_reg = this.A_reg<<8|(this.F_reg&0b11110000);
            this.push(this.AF_reg);
            return 16;
        case 0xC5:
            this.BC_reg = this.B_reg<<8|this.C_reg;
            this.push(this.BC_reg);
            return 16;
        case 0xD5:
            this.DE_reg = this.D_reg<<8|this.E_reg;
            this.push(this.DE_reg);
            return 16;
        case 0xE5:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.push(this.HL_reg);
            return 16;
        //POP
        case 0xF1:
            this.AF_reg = this.pop();
            this.A_reg = this.AF_reg>>8;
            this.F_reg = this.AF_reg&0xF0;
            return 12;
        case 0xC1:
            this.BC_reg = this.pop();
            this.B_reg = this.BC_reg>>8;
            this.C_reg = this.BC_reg&0xFF;
            return 12;
        case 0xD1:
            this.DE_reg = this.pop();
            this.D_reg = this.DE_reg>>8;
            this.E_reg = this.DE_reg&0xFF;
            return 12;
        case 0xE1:
            this.HL_reg = this.pop();
            this.H_reg = this.HL_reg>>8;
            this.L_reg = this.HL_reg&0xFF;
            return 12;
        //8 bit loads
        case 0x06:
            this.B_reg = this.mmu.read(this.PC_reg+1);
            this.PC_reg += 2;
            return 8;
        case 0x0E:
            this.C_reg = this.mmu.read(this.PC_reg+1);
            this.PC_reg += 2;
            return 8;
        case 0x16:
            this.D_reg = this.mmu.read(this.PC_reg+1);
            this.PC_reg += 2;
            return 8;
        case 0x1E:
            this.E_reg = this.mmu.read(this.PC_reg+1);
            this.PC_reg += 2;
            return 8;
        case 0x26:
            this.H_reg = this.mmu.read(this.PC_reg+1);
            this.PC_reg += 2;
            return 8;
        case 0x2E:
            this.L_reg = this.mmu.read(this.PC_reg+1);
            this.PC_reg += 2;
            return 8;
        case 0x7F:
            this.A_reg = this.A_reg;
            this.PC_reg++;
            return 4;
        case 0x47:
            this.B_reg = this.A_reg;
            this.PC_reg++;
            return 4;
        case 0x4F:
            this.C_reg = this.A_reg;
            this.PC_reg++;
            return 4;
        case 0x57:
            this.D_reg = this.A_reg;
            this.PC_reg++;
            return 4;
        case 0x5F:
            this.E_reg = this.A_reg;
            this.PC_reg++;
            return 4;
        case 0x67:
            this.H_reg = this.A_reg;
            this.PC_reg++;
            return 4;
        case 0x6F:
            this.L_reg = this.A_reg;
            this.PC_reg++;
            return 4;
        case 0x78:
            this.A_reg = this.B_reg;
            this.PC_reg++;
            return 4;
        case 0x79:
            this.A_reg = this.C_reg;
            this.PC_reg++;
            return 4;
        case 0x7A:
            this.A_reg = this.D_reg;
            this.PC_reg++;
            return 4;
        case 0x7B:
            this.A_reg = this.E_reg;
            this.PC_reg++;
            return 4;
        case 0x7C:
            this.A_reg = this.H_reg;
            this.PC_reg++;
            return 4;
        case 0x7D:
            this.A_reg = this.L_reg;
            this.PC_reg++;
            return 4;
        case 0x7E:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.A_reg = this.mmu.read(this.HL_reg);
            this.PC_reg++;
            return 8;
        case 0x40:
            this.B_reg = this.B_reg;
            this.PC_reg++;
            return 4;
        case 0x41:
            this.B_reg = this.C_reg;
            this.PC_reg++;
            return 4;
        case 0x42:
            this.B_reg = this.D_reg;
            this.PC_reg++;
            return 4;
        case 0x43:
            this.B_reg = this.E_reg;
            this.PC_reg++;
            return 4;
        case 0x44:
            this.B_reg = this.H_reg;
            this.PC_reg++;
            return 4;
        case 0x45:
            this.B_reg = this.L_reg;
            this.PC_reg++;
            return 4;
        case 0x46:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.B_reg = this.mmu.read(this.HL_reg);
            this.PC_reg++;
            return 8;
        case 0x48:
            this.C_reg = this.B_reg;
            this.PC_reg++;
            return 4;
        case 0x49:
            this.C_reg = this.C_reg;
            this.PC_reg++;
            return 4;
        case 0x4A:
            this.C_reg = this.D_reg;
            this.PC_reg++;
            return 4;
        case 0x4B:
            this.C_reg = this.E_reg;
            this.PC_reg++;
            return 4;
        case 0x4C:
            this.C_reg = this.H_reg;
            this.PC_reg++;
            return 4;
        case 0x4D:
            this.C_reg = this.L_reg;
            this.PC_reg++;
            return 4;
        case 0x4E:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.C_reg = this.mmu.read(this.HL_reg);
            this.PC_reg++;
            return 8;
        case 0x50:
            this.D_reg = this.B_reg;
            this.PC_reg++;
            return 4;
        case 0x51:
            this.D_reg = this.C_reg;
            this.PC_reg++;
            return 4;
        case 0x52:
            this.D_reg = this.D_reg;
            this.PC_reg++;
            return 4;
        case 0x53:
            this.D_reg = this.E_reg;
            this.PC_reg++;
            return 4;
        case 0x54:
            this.D_reg = this.H_reg;
            this.PC_reg++;
            return 4;
        case 0x55:
            this.D_reg = this.L_reg;
            this.PC_reg++;
            return 4;
        case 0x56:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.D_reg = this.mmu.read(this.HL_reg);
            this.PC_reg++;
            return 8; 
        case 0x58:
            this.E_reg = this.B_reg;
            this.PC_reg++;
            return 4;
        case 0x59:
            this.E_reg = this.C_reg;
            this.PC_reg++;
            return 4;
        case 0x5A:
            this.E_reg = this.D_reg;
            this.PC_reg++;
            return 4;
        case 0x5B:
            this.E_reg = this.E_reg;
            this.PC_reg++;
            return 4;
        case 0x5C:
            this.E_reg = this.H_reg;
            this.PC_reg++;
            return 4;
        case 0x5D:
            this.E_reg = this.L_reg;
            this.PC_reg++;
            return 4;
        case 0x5E:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.E_reg = this.mmu.read(this.HL_reg);
            this.PC_reg++;
            return 8;
        case 0x60:
            this.H_reg = this.B_reg;
            this.PC_reg++;
            return 4;
        case 0x61:
            this.H_reg = this.C_reg;
            this.PC_reg++;
            return 4;
        case 0x62:
            this.H_reg = this.D_reg;
            this.PC_reg++;
            return 4;
        case 0x63:
            this.H_reg = this.E_reg;
            this.PC_reg++;
            return 4;
        case 0x64:
            this.H_reg = this.H_reg;
            this.PC_reg++;
            return 4;
        case 0x65:
            this.H_reg = this.L_reg;
            this.PC_reg++;
            return 4;
        case 0x66:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.H_reg = this.mmu.read(this.HL_reg);
            this.PC_reg++;
            return 8;
        case 0x68:
            this.L_reg = this.B_reg;
            this.PC_reg++;
            return 4;
        case 0x69:
            this.L_reg = this.C_reg;
            this.PC_reg++;
            return 4;
        case 0x6A:
            this.L_reg = this.D_reg;
            this.PC_reg++;
            return 4;
        case 0x6B:
            this.L_reg = this.E_reg;
            this.PC_reg++;
            return 4;
        case 0x6C:
            this.L_reg = this.H_reg;
            this.PC_reg++;
            return 4;
        case 0x6D:
            this.L_reg = this.L_reg;
            this.PC_reg++;
            return 4;
        case 0x6E:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.L_reg = this.mmu.read(this.HL_reg);
            this.PC_reg++;
            return 8;
        case 0x70:
            this.writeToHL(this.B_reg);
            return 8;
        case 0x71:
            this.writeToHL(this.C_reg);
            return 8;
        case 0x72:
            this.writeToHL(this.D_reg);
            return 8;
        case 0x73:
            this.writeToHL(this.E_reg);
            return 8;
        case 0x74:
            this.writeToHL(this.H_reg);
            return 8;
        case 0x75:
            this.writeToHL(this.L_reg);
            return 8;
        case 0x36:
            this.writeToHL(this.mmu.read(this.PC_reg+1));
            this.PC_reg++;
            return 12;
        case 0x0A:
            this.BC_reg = this.B_reg<<8|this.C_reg;
            this.A_reg = this.mmu.read(this.BC_reg);
            this.PC_reg++;
            return 8;
        case 0x1A:
            this.DE_reg = this.D_reg<<8|this.E_reg;
            this.A_reg = this.mmu.read(this.DE_reg);
            this.PC_reg++;
            return 8;
        case 0x7E:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.A_reg = this.mmu.read(this.HL_reg);
            this.PC_reg++;
            return 8;
        case 0xFA:
            this.A_reg = this.mmu.read(this.readWord());
            return 16;
        case 0x3E:
            this.A_reg = this.mmu.read(this.PC_reg+1);
            this.PC_reg+=2;
            return 8;
        case 0x02:
            this.BC_reg = this.B_reg<<8|this.C_reg;
            this.mmu.write(this.BC_reg, this.A_reg);
            this.PC_reg++;
            return 8;
        case 0x12:
            this.DE_reg = this.D_reg<<8|this.E_reg;
            this.mmu.write(this.DE_reg, this.A_reg);
            this.PC_reg++;
            return 8;
        case 0x77:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg, this.A_reg);
            this.PC_reg++;
            return 8;
        case 0xEA:
            this.mmu.write(this.readWord(), this.A_reg);
            return 8;
        case 0xF2:
            this.A_reg = this.mmu.read(0xFF00+this.C_reg);
            this.PC_reg++;
            return 8;
        case 0xE2:
            this.mmu.write((0xFF00+this.C_reg),this.A_reg);
            this.PC_reg++;
            return 8;
        case 0x3A:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.A_reg = this.mmu.read(this.HL_reg);
            this.HL_reg = this.decrement16(this.HL_reg);
            this.H_reg = this.HL_reg>>8;
            this.L_reg = this.HL_reg&0xFF;
            return 8;
        case 0x32:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.A_reg);
            this.HL_reg = this.decrement16(this.HL_reg);
            this.H_reg = this.HL_reg>>8;
            this.L_reg = this.HL_reg&0xFF;
            return 8;
        case 0x2A:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.A_reg = this.mmu.read(this.HL_reg);
            this.HL_reg = this.increment16(this.HL_reg);
            this.H_reg = this.HL_reg>>8;
            this.L_reg = this.HL_reg&0xFF;
            return 8;
        case 0x22:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.A_reg);
            this.HL_reg = this.increment16(this.HL_reg);
            this.H_reg = this.HL_reg>>8;
            this.L_reg = this.HL_reg&0xFF;
            return 8;
        case 0xE0:
            this.mmu.write((0xFF00+this.mmu.read(this.PC_reg+1)),this.A_reg);
            this.PC_reg += 2;
            return 12;
        case 0xF0:
            this.A_reg = this.mmu.read((0xFF00+this.mmu.read(this.PC_reg+1)));
            this.PC_reg += 2;
            return 12;
        //ALU 8 bit
        case 0x87:
            this.add(this.A_reg);
            return 4;
        case 0x80:
            this.add(this.B_reg);
            return 4;
        case 0x81:
            this.add(this.C_reg);
            return 4;
        case 0x82:
            this.add(this.D_reg);
            return 4;
        case 0x83:
            this.add(this.E_reg);
            return 4;
        case 0x84:
            this.add(this.H_reg);
            return 4;
        case 0x85:
            this.add(this.L_reg);
            return 4;
        case 0x86:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.add(this.mmu.read(this.HL_reg));
            return 8;
        case 0xC6:
            this.add(this.mmu.read(this.PC_reg+1));
            this.PC_reg++;
            return 8;
        case 0x8F:
            this.addC(this.A_reg);
            return 4;
        case 0x88:
            this.addC(this.B_reg);
            return 4;
        case 0x89:
            this.addC(this.C_reg);
            return 4;
        case 0x8A:
            this.addC(this.D_reg);
            return 4;
        case 0x8B:
            this.addC(this.E_reg);
            return 4;
        case 0x8C:
            this.addC(this.H_reg);
            return 4;
        case 0x8D:
            this.addC(this.L_reg);
            return 4;
        case 0x8E:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.addC(this.mmu.read(this.HL_reg));
            return 8;
        case 0xCE:
            this.addC(this.mmu.read(this.PC_reg+1));
            this.PC_reg++;
            return 8;
        case 0x97:
            this.sub(this.A_reg);
            return 4;
        case 0x90:
            this.sub(this.B_reg);
            return 4;
        case 0x91:
            this.sub(this.C_reg);
            return 4;
        case 0x92:
            this.sub(this.D_reg);
            return 4;
        case 0x93:
            this.sub(this.E_reg);
            return 4;
        case 0x94:
            this.sub(this.H_reg);
            return 4;
        case 0x95:
            this.sub(this.L_reg);
            return 4;
        case 0x96:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.sub(this.mmu.read(this.HL_reg));
            return 8;
        case 0xD6:
            this.sub(this.mmu.read(this.PC_reg+1));
            this.PC_reg++;
            return 8;
        case 0x9F:
            this.subC(this.A_reg);
            return 4;
        case 0x98:
            this.subC(this.B_reg);
            return 4;
        case 0x99:
            this.subC(this.C_reg);
            return 4;
        case 0x9A:
            this.subC(this.D_reg);
            return 4;
        case 0x9B:
            this.subC(this.E_reg);
            return 4;
        case 0x9C:
            this.subC(this.H_reg);
            return 4;
        case 0x9D:
            this.subC(this.L_reg);
            return 4;
        case 0x9E:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.subC(this.mmu.read(this.HL_reg));
            return 8;
        case 0xDE:
            this.subC(this.mmu.read(this.PC_reg+1));
            this.PC_reg++;
            return 8;
        case 0xA7:
            this.ALU8(this.A_reg,0);
            return 4;
        case 0xA0:
            this.ALU8(this.B_reg,0);
            return 4;
        case 0xA1:
            this.ALU8(this.C_reg,0);
            return 4;
        case 0xA2:
            this.ALU8(this.D_reg,0);
            return 4;
        case 0xA3:
            this.ALU8(this.E_reg,0);
            return 4;
        case 0xA4:
            this.ALU8(this.H_reg,0);
            return 4;
        case 0xA5:
            this.ALU8(this.L_reg,0);
            return 4;
        case 0xA6:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.ALU8(this.mmu.read(this.HL_reg),0);
            return 8;
        case 0xE6:
            this.ALU8(this.mmu.read(this.PC_reg+1),0);
            this.PC_reg++;
            return 8;
        case 0xB7:
            this.ALU8(this.A_reg,1);
            return 4;
        case 0xB0:
            this.ALU8(this.B_reg,1);
            return 4;
        case 0xB1:
            this.ALU8(this.C_reg,1);
            return 4;
        case 0xB2:
            this.ALU8(this.D_reg,1);
            return 4;
        case 0xB3:
            this.ALU8(this.E_reg,1);
            return 4;
        case 0xB4:
            this.ALU8(this.H_reg,1);
            return 4;
        case 0xB5:
            this.ALU8(this.L_reg,1);
            return 4;
        case 0xB6:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.ALU8(this.mmu.read(this.HL_reg),1);
            return 8;
        case 0xF6:
            this.ALU8(this.mmu.read(this.PC_reg+1),1);
            this.PC_reg++;
            return 8;
        case 0xAF:
            this.ALU8(this.A_reg,2);
            return 4;
        case 0xA8:
            this.ALU8(this.B_reg,2);
            return 4;
        case 0xA9:
            this.ALU8(this.C_reg,2);
            return 4;
        case 0xAA:
            this.ALU8(this.D_reg,2);
            return 4;
        case 0xAB:
            this.ALU8(this.E_reg,2);
            return 4;
        case 0xAC:
            this.ALU8(this.H_reg,2);
            return 4;
        case 0xAD:
            this.ALU8(this.L_reg,2);
            return 4;
        case 0xAE:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.ALU8(this.mmu.read(this.HL_reg),2);
            return 8;
        case 0xEE:
            this.ALU8(this.mmu.read(this.PC_reg+1),2);
            this.PC_reg++;
            return 8;
        //compare
        case 0xBF:
            this.compare(this.A_reg);
            return 4;
        case 0xB8:
            this.compare(this.B_reg);
            return 4;
        case 0xB9:
            this.compare(this.C_reg);
            return 4;
        case 0xBA:
            this.compare(this.D_reg);
            return 4;
        case 0xBB:
            this.compare(this.E_reg);
            return 4;
        case 0xBC:
            this.compare(this.H_reg);
            return 4;
        case 0xBD:
            this.compare(this.L_reg);
            return 4;
        case 0xBE:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.compare(this.mmu.read(this.HL_reg));
            return 8;
        case 0xFE:
            this.compare(this.mmu.read(this.PC_reg+1));
            this.PC_reg++;
            return 8;
        //increment 8 bit
        case 0x3C:
            this.A_reg = this.increment8(this.A_reg);
            return 4;
        case 0x04:
            this.B_reg = this.increment8(this.B_reg);
            return 4;
        case 0x0C:
            this.C_reg = this.increment8(this.C_reg);
            return 4;
        case 0x14:
            this.D_reg = this.increment8(this.D_reg);
            return 4;
        case 0x1C:
            this.E_reg = this.increment8(this.E_reg);
            return 4;
        case 0x24:
            this.H_reg = this.increment8(this.H_reg);
            return 4;
        case 0x2C:
            this.L_reg = this.increment8(this.L_reg);
            return 4;
        case 0x34:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            var update = this.increment8(this.mmu.read(this.HL_reg));
            this.mmu.write(this.HL_reg, update);
            return 12;
        //decrement 8 bit
        case 0x3D:
            this.A_reg = this.decrement8(this.A_reg);
            return 4;
        case 0x05:
            this.B_reg = this.decrement8(this.B_reg);
            return 4;
        case 0x0D:
            this.C_reg = this.decrement8(this.C_reg);
            return 4;
        case 0x15:
            this.D_reg = this.decrement8(this.D_reg);
            return 4;
        case 0x1D:
            this.E_reg = this.decrement8(this.E_reg);
            return 4;
        case 0x25:
            this.H_reg = this.decrement8(this.H_reg);
            return 4;
        case 0x2D:
            this.L_reg = this.decrement8(this.L_reg);
            return 4;
        case 0x35:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            var update = this.decrement8(this.mmu.read(this.HL_reg));
            this.mmu.write(this.HL_reg, update);
            return 12;
        //16 bit arithmetic
        case 0x09:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.BC_reg = this.B_reg<<8|this.C_reg;
            this.HL_reg = this.ALU16(this.HL_reg,this.BC_reg);
            this.H_reg = this.HL_reg>>8;
            this.L_reg = this.HL_reg&0xFF;
            return 8;
        case 0x19:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.DE_reg = this.D_reg<<8|this.E_reg;
            this.HL_reg = this.ALU16(this.HL_reg,this.DE_reg);
            this.H_reg = this.HL_reg>>8;
            this.L_reg = this.HL_reg&0xFF;
            return 8;
        case 0x29:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.HL_reg = this.ALU16(this.HL_reg,this.HL_reg);
            this.H_reg = this.HL_reg>>8;
            this.L_reg = this.HL_reg&0xFF;
            return 8;
        case 0x39:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.HL_reg = this.ALU16(this.HL_reg,this.SP_reg);
            this.H_reg = this.HL_reg>>8;
            this.L_reg = this.HL_reg&0xFF;
            return 8;
        case 0xE8:
            var value = this.getSign(this.mmu.read(this.PC_reg+1));
            this.SP_reg = this.addSP(value);
            this.PC_reg++;
            return 16;
        case 0x03:
            this.BC_reg = this.B_reg<<8|this.C_reg;
            this.BC_reg = this.increment16(this.BC_reg);
            this.B_reg = this.BC_reg>>8;
            this.C_reg = this.BC_reg&0xFF;
            return 8;
        case 0x13:
            this.DE_reg = this.D_reg<<8|this.E_reg;
            this.DE_reg = this.increment16(this.DE_reg);
            this.D_reg = this.DE_reg>>8;
            this.E_reg = this.DE_reg&0xFF;
            return 8;
        case 0x23:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.HL_reg = this.increment16(this.HL_reg);
            this.H_reg = this.HL_reg>>8;
            this.L_reg = this.HL_reg&0xFF;
            return 8;
        case 0x33:
            this.SP_reg = this.increment16(this.SP_reg);
            return 8;
        case 0x0B:
            this.BC_reg = this.B_reg<<8|this.C_reg;
            this.BC_reg = this.decrement16(this.BC_reg);
            this.B_reg = this.BC_reg>>8;
            this.C_reg = this.BC_reg&0xFF;
            return 8;
        case 0x1B:
            this.DE_reg = this.D_reg<<8|this.E_reg;
            this.DE_reg = this.decrement16(this.DE_reg);
            this.D_reg = this.DE_reg>>8;
            this.E_reg = this.DE_reg&0xFF;
            return 8;
        case 0x2B:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.HL_reg = this.decrement16(this.HL_reg);
            this.H_reg = this.HL_reg>>8;
            this.L_reg = this.HL_reg&0xFF;
            return 8;
        case 0x3B:
            this.SP_reg = this.decrement16(this.SP_reg);
            return 8;
        //extended op code
        case 0xCB:
            this.PC_reg++;
            return this.executeCB(this.mmu.read(this.PC_reg));
        //DAA
        case 0x27:
            var temp = this.A_reg;

            if ((this.F_reg & 0b01000000) == 0) 
            {
                if ((this.F_reg & 0b00100000) == 0b00100000 || (temp & 0xF) > 9)
                    temp += 0x06;

                if ((this.F_reg & 0b00010000) == 0b00010000 || temp > 0x9F)
                    temp += 0x60;
            } else {
                if ((this.F_reg & 0b00100000) == 0b00100000)
                    temp = ((temp - 6) & 0xFF);

                if ((this.F_reg & 0b00010000) == 0b00010000)
                    temp -= 0x60;
            }

            this.F_reg &= ~(0b00100000 | 0b10000000);

            if ((temp & 0x100) == 0x100)
                this.F_reg |= 0b00010000;

            temp &= 0xFF;

            if (temp == 0)
                this.F_reg |= 0b10000000;

            this.A_reg = temp;
            this.PC_reg++;
            return 4;
        //CPL
        case 0x2F:
            this.F_reg |= 0b01100000;
            this.A_reg ^= 0xFF;
            this.PC_reg++;
            return 4;
        //CCF
        case 0x3F:
            if(this.F_reg&0b00010000)
                this.F_reg &= ~(0b00011111);
            else
                this.F_reg |= 0b00010000;
            this.F_reg &= 0b10010000;
            this.PC_reg++;
            return 4;
        //SCF
        case 0x37:
            this.F_reg &= 0b10000000;
            this.F_reg |= 0b00010000;
            this.PC_reg++;
            return 4;
        //Halt
        case 0x76:
            var req = this.mmu.read(0xFF0F);
            var enabledreq = this.mmu.read(0xFFFF);
            if(this.enabled == 0)
            {
                //if IME = 0 and (IF&IE !=0) is initially true
                //do not halt, do halting bug.
                if(req&enabledreq)
                {
                    console.log("halt bug");
                    this.haltbug = true;
                    this.PC_reg++;
                    return 4;
                }
            }
            this.halt = true;
            this.PC_reg++;
            return 4;
        //stop
        case 0x10:
            this.PC_reg+=2;
            return 4;
        //when doing interrupt handler
        //DI EI
        case 0xF3:
            this.pendDisabled = true;
            this.PC_reg++;
            return 4;
        case 0xFB:
            this.pendEnabled = true;
            this.PC_reg++;
            return 4;
        //RLCA
        case 0x07:
            this.A_reg = this.rlc(this.A_reg);
            this.F_reg &= 0b01110000;
            return 4;
        //RLA
        case 0x17:
            this.A_reg = this.rl(this.A_reg);
            this.F_reg &= 0b01110000;
            return 4;
        //RRCA
        case 0x0F:
            this.A_reg = this.rrc(this.A_reg);
            this.F_reg &= 0b01110000;
            return 4;
        //RRA
        case 0x1F:
            this.A_reg = this.rr(this.A_reg);
            this.F_reg &= 0b01110000;
            return 4;
    }
}
CPU.prototype.executeCB = function(instruction) {
    
    switch(instruction)
    {
        //swap
        case 0x37:
            this.A_reg = this.swap(this.A_reg);
            return 8;
        case 0x30:
            this.B_reg = this.swap(this.B_reg);
            return 8;
        case 0x31:
            this.C_reg = this.swap(this.C_reg);
            return 8;
        case 0x32:
            this.D_reg = this.swap(this.D_reg);
            return 8;
        case 0x33:
            this.E_reg = this.swap(this.E_reg);
            return 8;
        case 0x34:
            this.H_reg = this.swap(this.H_reg);
            return 8;
        case 0x35:
            this.L_reg = this.swap(this.L_reg);
            return 8;
        case 0x36:
            this.HL_reg = this.H_reg<<8|this.L_reg; 
            this.mmu.write(this.HL_reg, this.swap(this.mmu.read(this.HL_reg)));
            return 16;
        //RLC
        case 0x07:
            this.A_reg = this.rlc(this.A_reg);
            return 8;
        case 0x00:
            this.B_reg = this.rlc(this.B_reg);
            return 8;
        case 0x01:
            this.C_reg = this.rlc(this.C_reg);
            return 8;
        case 0x02:
            this.D_reg = this.rlc(this.D_reg);
            return 8;
        case 0x03:
            this.E_reg = this.rlc(this.E_reg);
            return 8;
        case 0x04:
            this.H_reg = this.rlc(this.H_reg);
            return 8;
        case 0x05:
            this.L_reg = this.rlc(this.L_reg);
            return 8;
        case 0x06:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.rlc(this.mmu.read(this.HL_reg)));
            return 16;
        //RL
        case 0x17:
            this.A_reg = this.rl(this.A_reg);
            return 8;
        case 0x10:
            this.B_reg = this.rl(this.B_reg);
            return 8;
        case 0x11:
            this.C_reg = this.rl(this.C_reg);
            return 8;
        case 0x12:
            this.D_reg = this.rl(this.D_reg);
            return 8;
        case 0x13:
            this.E_reg = this.rl(this.E_reg);
            return 8;
        case 0x14:
            this.H_reg = this.rl(this.H_reg);
            return 8;
        case 0x15:
            this.L_reg = this.rl(this.L_reg);
            return 8;
        case 0x16:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.rl(this.mmu.read(this.HL_reg)));
            return 16;
        //RRC
        case 0x0F:
            this.A_reg = this.rrc(this.A_reg);
            return 8;
        case 0x08:
            this.B_reg = this.rrc(this.B_reg);
            return 8;
        case 0x09:
            this.C_reg = this.rrc(this.C_reg);
            return 8;
        case 0x0A:
            this.D_reg = this.rrc(this.D_reg);
            return 8;
        case 0x0B:
            this.E_reg = this.rrc(this.E_reg);
            return 8;
        case 0x0C:
            this.H_reg = this.rrc(this.H_reg);
            return 8;
        case 0x0D:
            this.L_reg = this.rrc(this.L_reg);
            return 8;
        case 0x0E:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.rrc(this.mmu.read(this.HL_reg)));
            return 16;
        //RR
        case 0x1F:
            this.A_reg = this.rr(this.A_reg);
            return 8;
        case 0x18:
            this.B_reg = this.rr(this.B_reg);
            return 8;
        case 0x19:
            this.C_reg = this.rr(this.C_reg);
            return 8;
        case 0x1A:
            this.D_reg = this.rr(this.D_reg);
            return 8;
        case 0x1B:
            this.E_reg = this.rr(this.E_reg);
            return 8;
        case 0x1C:
            this.H_reg = this.rr(this.H_reg);
            return 8;
        case 0x1D:
            this.L_reg = this.rr(this.L_reg);
            return 8;
        case 0x1E:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.rr(this.mmu.read(this.HL_reg)));
            return 16;
        //SLA
        case 0x27:
            this.A_reg = this.sla(this.A_reg);
            return 8;
        case 0x20:
            this.B_reg = this.sla(this.B_reg);
            return 8;
        case 0x21:
            this.C_reg = this.sla(this.C_reg);
            return 8;
        case 0x22:
            this.D_reg = this.sla(this.D_reg);
            return 8;
        case 0x23:
            this.E_reg = this.sla(this.E_reg);
            return 8;
        case 0x24:
            this.H_reg = this.sla(this.H_reg);
            return 8;
        case 0x25:
            this.L_reg = this.sla(this.L_reg);
            return 8;
        case 0x26:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.sla(this.mmu.read(this.HL_reg)));
            return 16;
        //SRA
        case 0x2F:
            this.A_reg = this.sra(this.A_reg);
            return 8;
        case 0x28:
            this.B_reg = this.sra(this.B_reg);
            return 8;
        case 0x29:
            this.C_reg = this.sra(this.C_reg);
            return 8;
        case 0x2A:
            this.D_reg = this.sra(this.D_reg);
            return 8;
        case 0x2B:
            this.E_reg = this.sra(this.E_reg);
            return 8;
        case 0x2C:
            this.H_reg = this.sra(this.H_reg);
            return 8;
        case 0x2D:
            this.L_reg = this.sra(this.L_reg);
            return 8;
        case 0x2E:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.sra(this.mmu.read(this.HL_reg)));
            return 16;
        //SRL
        case 0x3F:
            this.A_reg = this.srl(this.A_reg);
            return 8;
        case 0x38:
            this.B_reg = this.srl(this.B_reg);
            return 8;
        case 0x39:
            this.C_reg = this.srl(this.C_reg);
            return 8;
        case 0x3A:
            this.D_reg = this.srl(this.D_reg);
            return 8;
        case 0x3B:
            this.E_reg = this.srl(this.E_reg);
            return 8;
        case 0x3C:
            this.H_reg = this.srl(this.H_reg);
            return 8;
        case 0x3D:
            this.L_reg = this.srl(this.L_reg);
            return 8;
        case 0x3E:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.srl(this.mmu.read(this.HL_reg)));
            return 16;
        //test bit
        case 0x40:
            this.testBit(this.B_reg,0);
            return 8;
        case 0x41:
            this.testBit(this.C_reg,0);
            return 8;
        case 0x42:
            this.testBit(this.D_reg,0);
            return 8;
        case 0x43:
            this.testBit(this.E_reg,0);
            return 8;
        case 0x44:
            this.testBit(this.H_reg,0);
            return 8;
        case 0x45:
            this.testBit(this.L_reg,0);
            return 8;
        case 0x46:
            
           this.HL_reg = this.H_reg<<8|this.L_reg; this.testBit(this.mmu.read(this.HL_reg),0);
            return 12;
        case 0x47:
            this.testBit(this.A_reg,0);
            return 8;
        case 0x48:
            this.testBit(this.B_reg,1);
            return 8;
        case 0x49:
            this.testBit(this.C_reg,1);
            return 8;
        case 0x4A:
            this.testBit(this.D_reg,1);
            return 8;
        case 0x4B:
            this.testBit(this.E_reg,1);
            return 8;
        case 0x4C:
            this.testBit(this.H_reg,1);
            return 8;
        case 0x4D:
            this.testBit(this.L_reg,1);
            return 8;
        case 0x4E:
            
           this.HL_reg = this.H_reg<<8|this.L_reg; this.testBit(this.mmu.read(this.HL_reg),1);
            return 12;
        case 0x4F:
            this.testBit(this.A_reg,1);
            return 8;
        case 0x50:
            this.testBit(this.B_reg,2);
            return 8;
        case 0x51:
            this.testBit(this.C_reg,2);
            return 8;
        case 0x52:
            this.testBit(this.D_reg,2);
            return 8;
        case 0x53:
            this.testBit(this.E_reg,2);
            return 8;
        case 0x54:
            this.testBit(this.H_reg,2);
            return 8;
        case 0x55:
            this.testBit(this.L_reg,2);
            return 8;
        case 0x56:
            
           this.HL_reg = this.H_reg<<8|this.L_reg; this.testBit(this.mmu.read(this.HL_reg),2);
            return 12;
        case 0x57:
            this.testBit(this.A_reg,2);
            return 8;
        case 0x58:
            this.testBit(this.B_reg,3);
            return 8;
        case 0x59:
            this.testBit(this.C_reg,3);
            return 8;
        case 0x5A:
            this.testBit(this.D_reg,3);
            return 8;
        case 0x5B:
            this.testBit(this.E_reg,3);
            return 8;
        case 0x5C:
            this.testBit(this.H_reg,3);
            return 8;
        case 0x5D:
            this.testBit(this.L_reg,3);
            return 8;
        case 0x5E:
            
           this.HL_reg = this.H_reg<<8|this.L_reg; this.testBit(this.mmu.read(this.HL_reg),3);
            return 12;
        case 0x5F:
            this.testBit(this.A_reg,3);
            return 8;
        case 0x60:
            this.testBit(this.B_reg,4);
            return 8;
        case 0x61:
            this.testBit(this.C_reg,4);
            return 8;
        case 0x62:
            this.testBit(this.D_reg,4);
            return 8;
        case 0x63:
            this.testBit(this.E_reg,4);
            return 8;
        case 0x64:
            this.testBit(this.H_reg,4);
            return 8;
        case 0x65:
            this.testBit(this.L_reg,4);
            return 8;
        case 0x66:
            
           this.HL_reg = this.H_reg<<8|this.L_reg; this.testBit(this.mmu.read(this.HL_reg),4);
            return 12;
        case 0x67:
            this.testBit(this.A_reg,4);
            return 8;
        case 0x68:
            this.testBit(this.B_reg,5);
            return 8;
        case 0x69:
            this.testBit(this.C_reg,5);
            return 8;
        case 0x6A:
            this.testBit(this.D_reg,5);
            return 8;
        case 0x6B:
            this.testBit(this.E_reg,5);
            return 8;
        case 0x6C:
            this.testBit(this.H_reg,5);
            return 8;
        case 0x6D:
            this.testBit(this.L_reg,5);
            return 8;
        case 0x6E:
            
           this.HL_reg = this.H_reg<<8|this.L_reg; this.testBit(this.mmu.read(this.HL_reg),5);
            return 12;
        case 0x6F:
            this.testBit(this.A_reg,5);
            return 8;
        case 0x70:
            this.testBit(this.B_reg,6);
            return 8;
        case 0x71:
            this.testBit(this.C_reg,6);
            return 8;
        case 0x72:
            this.testBit(this.D_reg,6);
            return 8;
        case 0x73:
            this.testBit(this.E_reg,6);
            return 8;
        case 0x74:
            this.testBit(this.H_reg,6);
            return 8;
        case 0x75:
            this.testBit(this.L_reg,6);
            return 8;
        case 0x76:
            
           this.HL_reg = this.H_reg<<8|this.L_reg; this.testBit(this.mmu.read(this.HL_reg),6);
            return 12;
        case 0x77:
            this.testBit(this.A_reg,6);
            return 8;
        case 0x78:
            this.testBit(this.B_reg,7);
            return 8;
        case 0x79:
            this.testBit(this.C_reg,7);
            return 8;
        case 0x7A:
            this.testBit(this.D_reg,7);
            return 8;
        case 0x7B:
            this.testBit(this.E_reg,7);
            return 8;
        case 0x7C:
            this.testBit(this.H_reg,7);
            return 8;
        case 0x7D:
            this.testBit(this.L_reg,7);
            return 8;
        case 0x7E:
            
           this.HL_reg = this.H_reg<<8|this.L_reg; this.testBit(this.mmu.read(this.HL_reg),7);
            return 12;
        case 0x7F:
            this.testBit(this.A_reg,7);
            return 8;
        //reset bit
        case 0x80:
            this.B_reg = this.resetBit(this.B_reg,0);
            return 8;
        case 0x81:
            this.C_reg = this.resetBit(this.C_reg,0);
            return 8;
        case 0x82:
            this.D_reg = this.resetBit(this.D_reg,0);
            return 8;
        case 0x83:
            this.E_reg = this.resetBit(this.E_reg,0);
            return 8;
        case 0x84:
            this.H_reg = this.resetBit(this.H_reg,0);
            return 8;
        case 0x85:
            this.L_reg = this.resetBit(this.L_reg,0);
            return 8;
        case 0x86:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.resetBit(this.mmu.read(this.HL_reg),0));
            return 16;
        case 0x87:
            this.A_reg = this.resetBit(this.A_reg,0);
            return 8;
        case 0x88:
            this.B_reg = this.resetBit(this.B_reg,1);
            return 8;
        case 0x89:
            this.C_reg = this.resetBit(this.C_reg,1);
            return 8;
        case 0x8A:
            this.D_reg = this.resetBit(this.D_reg,1);
            return 8;
        case 0x8B:
            this.E_reg = this.resetBit(this.E_reg,1);
            return 8;
        case 0x8C:
            this.H_reg = this.resetBit(this.H_reg,1);
            return 8;
        case 0x8D:
            this.L_reg = this.resetBit(this.L_reg,1);
            return 8;
        case 0x8E:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.resetBit(this.mmu.read(this.HL_reg),1));
            return 16;
        case 0x8F:
            this.A_reg = this.resetBit(this.A_reg,1);
            return 8;
        case 0x90:
            this.B_reg = this.resetBit(this.B_reg,2);
            return 8;
        case 0x91:
            this.C_reg = this.resetBit(this.C_reg,2);
            return 8;
        case 0x92:
            this.D_reg = this.resetBit(this.D_reg,2);
            return 8;
        case 0x93:
            this.E_reg = this.resetBit(this.E_reg,2);
            return 8;
        case 0x94:
            this.H_reg = this.resetBit(this.H_reg,2);
            return 8;
        case 0x95:
            this.L_reg = this.resetBit(this.L_reg,2);
            return 8;
        case 0x96:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.resetBit(this.mmu.read(this.HL_reg),2));
            return 16;
        case 0x97:
            this.A_reg = this.resetBit(this.A_reg,2);
            return 8;
        case 0x98:
            this.B_reg = this.resetBit(this.B_reg,3);
            return 8;
        case 0x99:
            this.C_reg = this.resetBit(this.C_reg,3);
            return 8;
        case 0x9A:
            this.D_reg = this.resetBit(this.D_reg,3);
            return 8;
        case 0x9B:
            this.E_reg = this.resetBit(this.E_reg,3);
            return 8;
        case 0x9C:
            this.H_reg = this.resetBit(this.H_reg,3);
            return 8;
        case 0x9D:
            this.L_reg = this.resetBit(this.L_reg,3);
            return 8;
        case 0x9E:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.resetBit(this.mmu.read(this.HL_reg),3));
            return 16;
        case 0x9F:
            this.A_reg = this.resetBit(this.A_reg,3);
            return 8;
        case 0xA0:
            this.B_reg = this.resetBit(this.B_reg,4);
            return 8;
        case 0xA1:
            this.C_reg = this.resetBit(this.C_reg,4);
            return 8;
        case 0xA2:
            this.D_reg = this.resetBit(this.D_reg,4);
            return 8;
        case 0xA3:
            this.E_reg = this.resetBit(this.E_reg,4);
            return 8;
        case 0xA4:
            this.H_reg = this.resetBit(this.H_reg,4);
            return 8;
        case 0xA5:
            this.L_reg = this.resetBit(this.L_reg,4);
            return 8;
        case 0xA6:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.resetBit(this.mmu.read(this.HL_reg),4));
            return 16;
        case 0xA7:
            this.A_reg = this.resetBit(this.A_reg,4);
            return 8;
        case 0xA8:
            this.B_reg = this.resetBit(this.B_reg,5);
            return 8;
        case 0xA9:
            this.C_reg = this.resetBit(this.C_reg,5);
            return 8;
        case 0xAA:
            this.D_reg = this.resetBit(this.D_reg,5);
            return 8;
        case 0xAB:
            this.E_reg = this.resetBit(this.E_reg,5);
            return 8;
        case 0xAC:
            this.H_reg = this.resetBit(this.H_reg,5);
            return 8;
        case 0xAD:
            this.L_reg = this.resetBit(this.L_reg,5);
            return 8;
        case 0xAE:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.resetBit(this.mmu.read(this.HL_reg),5));
            return 16;
        case 0xAF:
            this.A_reg = this.resetBit(this.A_reg,5);
            return 8;
        case 0xB0:
            this.B_reg = this.resetBit(this.B_reg,6);
            return 8;
        case 0xB1:
            this.C_reg = this.resetBit(this.C_reg,6);
            return 8;
        case 0xB2:
            this.D_reg = this.resetBit(this.D_reg,6);
            return 8;
        case 0xB3:
            this.E_reg = this.resetBit(this.E_reg,6);
            return 8;
        case 0xB4:
            this.H_reg = this.resetBit(this.H_reg,6);
            return 8;
        case 0xB5:
            this.L_reg = this.resetBit(this.L_reg,6);
            return 8;
        case 0xB6:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.resetBit(this.mmu.read(this.HL_reg),6));
            return 16;
        case 0xB7:
            this.A_reg = this.resetBit(this.A_reg,6);
            return 8;
        case 0xB8:
            this.B_reg = this.resetBit(this.B_reg,7);
            return 8;
        case 0xB9:
            this.C_reg = this.resetBit(this.C_reg,7);
            return 8;
        case 0xBA:
            this.D_reg = this.resetBit(this.D_reg,7);
            return 8;
        case 0xBB:
            this.E_reg = this.resetBit(this.E_reg,7);
            return 8;
        case 0xBC:
            this.H_reg = this.resetBit(this.H_reg,7);
            return 8;
        case 0xBD:
            this.L_reg = this.resetBit(this.L_reg,7);
            return 8;
        case 0xBE:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.resetBit(this.mmu.read(this.HL_reg),7));
            return 16;
        case 0xBF:
            this.A_reg = this.resetBit(this.A_reg,7);
            return 8;
        //set bit
        case 0xC0:
            this.B_reg = this.setBit(this.B_reg,0);
            return 8;
        case 0xC1:
            this.C_reg = this.setBit(this.C_reg,0);
            return 8;
        case 0xC2:
            this.D_reg = this.setBit(this.D_reg,0);
            return 8;
        case 0xC3:
            this.E_reg = this.setBit(this.E_reg,0);
            return 8;
        case 0xC4:
            this.H_reg = this.setBit(this.H_reg,0);
            return 8;
        case 0xC5:
            this.L_reg = this.setBit(this.L_reg,0);
            return 8;
        case 0xC6:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.setBit(this.mmu.read(this.HL_reg),0));
            return 16;
        case 0xC7:
            this.A_reg = this.setBit(this.A_reg,0);
            return 8;
        case 0xC8:
            this.B_reg = this.setBit(this.B_reg,1);
            return 8;
        case 0xC9:
            this.C_reg = this.setBit(this.C_reg,1);
            return 8;
        case 0xCA:
            this.D_reg = this.setBit(this.D_reg,1);
            return 8;
        case 0xCB:
            this.E_reg = this.setBit(this.E_reg,1);
            return 8;
        case 0xCC:
            this.H_reg = this.setBit(this.H_reg,1);
            return 8;
        case 0xCD:
            this.L_reg = this.setBit(this.L_reg,1);
            return 8;
        case 0xCE:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.setBit(this.mmu.read(this.HL_reg),1));
            return 16;
        case 0xCF:
            this.A_reg = this.setBit(this.A_reg,1);
            return 8;
        case 0xD0:
            this.B_reg = this.setBit(this.B_reg,2);
            return 8;
        case 0xD1:
            this.C_reg = this.setBit(this.C_reg,2);
            return 8;
        case 0xD2:
            this.D_reg = this.setBit(this.D_reg,2);
            return 8;
        case 0xD3:
            this.E_reg = this.setBit(this.E_reg,2);
            return 8;
        case 0xD4:
            this.H_reg = this.setBit(this.H_reg,2);
            return 8;
        case 0xD5:
            this.L_reg = this.setBit(this.L_reg,2);
            return 8;
        case 0xD6:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.setBit(this.mmu.read(this.HL_reg),2));
            return 16;
        case 0xD7:
            this.A_reg = this.setBit(this.A_reg,2);
            return 8;
        case 0xD8:
            this.B_reg = this.setBit(this.B_reg,3);
            return 8;
        case 0xD9:
            this.C_reg = this.setBit(this.C_reg,3);
            return 8;
        case 0xDA:
            this.D_reg = this.setBit(this.D_reg,3);
            return 8;
        case 0xDB:
            this.E_reg = this.setBit(this.E_reg,3);
            return 8;
        case 0xDC:
            this.H_reg = this.setBit(this.H_reg,3);
            return 8;
        case 0xDD:
            this.L_reg = this.setBit(this.L_reg,3);
            return 8;
        case 0xDE:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.setBit(this.mmu.read(this.HL_reg),3));
            return 16;
        case 0xDF:
            this.A_reg = this.setBit(this.A_reg,3);
            return 8;
        case 0xE0:
            this.B_reg = this.setBit(this.B_reg,4);
            return 8;
        case 0xE1:
            this.C_reg = this.setBit(this.C_reg,4);
            return 8;
        case 0xE2:
            this.D_reg = this.setBit(this.D_reg,4);
            return 8;
        case 0xE3:
            this.E_reg = this.setBit(this.E_reg,4);
            return 8;
        case 0xE4:
            this.H_reg = this.setBit(this.H_reg,4);
            return 8;
        case 0xE5:
            this.L_reg = this.setBit(this.L_reg,4);
            return 8;
        case 0xE6:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.setBit(this.mmu.read(this.HL_reg),4));
            return 16;
        case 0xE7:
            this.A_reg = this.setBit(this.A_reg,4);
            return 8;
        case 0xE8:
            this.B_reg = this.setBit(this.B_reg,5);
            return 8;
        case 0xE9:
            this.C_reg = this.setBit(this.C_reg,5);
            return 8;
        case 0xEA:
            this.D_reg = this.setBit(this.D_reg,5);
            return 8;
        case 0xEB:
            this.E_reg = this.setBit(this.E_reg,5);
            return 8;
        case 0xEC:
            this.H_reg = this.setBit(this.H_reg,5);
            return 8;
        case 0xED:
            this.L_reg = this.setBit(this.L_reg,5);
            return 8;
        case 0xEE:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.setBit(this.mmu.read(this.HL_reg),5));
            return 16;
        case 0xEF:
            this.A_reg = this.setBit(this.A_reg,5);
            return 8;
        case 0xF0:
            this.B_reg = this.setBit(this.B_reg,6);
            return 8;
        case 0xF1:
            this.C_reg = this.setBit(this.C_reg,6);
            return 8;
        case 0xF2:
            this.D_reg = this.setBit(this.D_reg,6);
            return 8;
        case 0xF3:
            this.E_reg = this.setBit(this.E_reg,6);
            return 8;
        case 0xF4:
            this.H_reg = this.setBit(this.H_reg,6);
            return 8;
        case 0xF5:
            this.L_reg = this.setBit(this.L_reg,6);
            return 8;
        case 0xF6:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.setBit(this.mmu.read(this.HL_reg),6));
            return 16;
        case 0xF7:
            this.A_reg = this.setBit(this.A_reg,6);
            return 8;
        case 0xF8:
            this.B_reg = this.setBit(this.B_reg,7);
            return 8;
        case 0xF9:
            this.C_reg = this.setBit(this.C_reg,7);
            return 8;
        case 0xFA:
            this.D_reg = this.setBit(this.D_reg,7);
            return 8;
        case 0xFB:
            this.E_reg = this.setBit(this.E_reg,7);
            return 8;
        case 0xFC:
            this.H_reg = this.setBit(this.H_reg,7);
            return 8;
        case 0xFD:
            this.L_reg = this.setBit(this.L_reg,7);
            return 8;
        case 0xFE:
            this.HL_reg = this.H_reg<<8|this.L_reg;
            this.mmu.write(this.HL_reg,this.setBit(this.mmu.read(this.HL_reg),7));
            return 16;
        case 0xFF:
            this.A_reg = this.setBit(this.A_reg,7);
            return 8;
    }
}