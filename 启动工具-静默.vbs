Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
sh.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)

Function PortListening()
  Dim exec, out
  Set exec = sh.Exec("cmd /c netstat -ano | findstr "":3210""")
  out = exec.StdOut.ReadAll()
  PortListening = (InStr(out, "LISTENING") > 0)
End Function

If Not PortListening() Then
  sh.Run "node server.js", 0, False
  WScript.Sleep 3000
End If
sh.Run "http://127.0.0.1:3210", 1, False
