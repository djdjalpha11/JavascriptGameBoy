function TIMER(mmu){
    this.mmu = mmu;
    
    this.clocksElapsed = 0;
}
TIMER.prototype.updateTimer = function(cycles){
    
    var TIMA = this.mmu.wram[0xFF05];
    var stopTIMA = this.mmu.read(0xFF07)&0b100 ? 1:0;//TAC bit 2
    this.mmu.clocksToUpdateDIV += cycles;
    if(this.mmu.updatedClockSpeed == true)
    {
        this.mmu.updatedClockSpeed = false;
        this.clocksElapsed = 0;
    }
    if(stopTIMA==1)//if timer is on
    {
        this.clocksElapsed += cycles;
        if(this.clocksElapsed>=this.mmu.clocksToUpdateTIMA)
        {
            this.mmu.wram[0xFF05]++;//increment TIMA
            this.clocksElapsed = 0;
            if(TIMA==256)
            {
                this.mmu.wram[0xFF05] = this.mmu.wram[0xFF06];//laod value of TMA into TIMA
                var flag = this.mmu.read(0xFF0F)|0b00000100;
                this.mmu.write(0xFF0F,flag);//request timer interrupt 
            }
        }
    }
    ///*
    if(this.mmu.clocksToUpdateDIV>=256)
    { 
        this.mmu.wram[0xFF04]++;//increment DIV
        this.mmu.clocksToUpdateDIV = 0;
    }
    //*/
}
TIMER.prototype.setFrequency = function(){
    
    var TAC = this.mmu.read(0xFF07);
    var inputClockSelect = TAC&0b11;
    switch(inputClockSelect)
    {
        case 0:
            return 1024;
        case 1:
            return 16;
        case 2:
             return 64;
        case 3:
            return 256;
    }
}