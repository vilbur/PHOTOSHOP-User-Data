#SingleInstance force

$keystroke	= %1%

SetTitleMatchMode 2

; SetKeyDelay, 10, 10
; SetKeyDelay, 5, 5

IfWinExist, ahk_exe Photoshop.exe
{
    WinActivate ; Use the window found by IfWinExist.

    Send, %$keystroke%
}
