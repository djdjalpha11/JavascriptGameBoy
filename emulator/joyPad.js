function JOYPAD(){
    
    this.joyPadState = 0xFF;
}
JOYPAD.prototype.keypress = function(event){
    
    switch(event.keyCode)
    {
        case 8://backspace
            this.joyPadState &= ~0b01000000;//select
            break;
        case 13://enter
            this.joyPadState &= ~0b10000000;//start
            break;
        case 88://x
            this.joyPadState &= ~0b00010000;//button B
            break;
        case 90://z
            this.joyPadState &= ~0b00100000;//button A
            break;
        case 37://left
            this.joyPadState &= ~0b00000010;
            break;
        case 38://up
            this.joyPadState &= ~0b00000100;
            break;
        case 39://right
            this.joyPadState &= ~0b00000001;
            break;
        case 40://down
            this.joyPadState &= ~0b00001000;
            break;
    }
}
JOYPAD.prototype.keyrelease = function(event){

    switch(event.keyCode)
    {
        case 8://backspace
            this.joyPadState |= 0b01000000;//select
            break;
        case 13://enter
            this.joyPadState |= 0b10000000;//start
            break;
        case 88://x
            this.joyPadState |= 0b00010000;//button B
            break;
        case 90://z
            this.joyPadState |= 0b00100000;//button A
            break;
        case 37://left
            this.joyPadState |= 0b00000010;
            break;
        case 38://up
            this.joyPadState |= 0b00000100;
            break;
        case 39://right
            this.joyPadState |= 0b00000001;
            break;
        case 40://down
            this.joyPadState |= 0b00001000;
            break;
    }
}