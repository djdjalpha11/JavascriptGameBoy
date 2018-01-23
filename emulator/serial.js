function SERIAL (mmu) {
    
    this.mmu = mmu;
    
    this.SB = 0;
    this.SC = 0;
    this.currentBit = 0;
    this.clocksElapsed = 0;
}//implement websockets for transfer of data
SERIAL.prototype.doSerial = function (cycles){
    ///*
    this.SC = this.mmu.read(0xFF02);

    if (this.SC&(1<<7) && this.SC&(1))
    {
        this.clocksElapsed += cycles;

        if (this.currentBit < 0)
        {
            this.currentBit = 0;
            this.clocksElapsed = 0;
            return;
        }

        var serial_cycles = this.SC&1 ? 16:512;//256KHZ:8KHZ frequency

        if (this.clocksElapsed >= serial_cycles)
        {
            if (this.currentBit > 7)
            {
                this.mmu.write(0xFF02, this.SC & 0x7F);
                var flag = this.mmu.read(0xFF0F)|0b00001000;
                this.mmu.write(0xFF0F,flag);
                this.currentBit = -1;

                return;
            }

            this.SB = this.mmu.read(0xFF01);
            this.SB <<= 1;
            this.SB |= 0x01;
            this.mmu.write(0xFF01, this.SB);

            this.clocksElapsed -= serial_cycles;
            this.currentBit++;
        }
    }
    //*/
}
SERIAL.prototype.reset = function() {
    
}