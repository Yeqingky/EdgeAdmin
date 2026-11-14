package nodes

import (
	"os/exec"
	"strings"
	"testing"
)

func TestLinuxInstallScriptSyntax(t *testing.T) {
	if _, err := exec.LookPath("bash"); err != nil {
		t.Skip("bash not installed")
	}
	script := linuxInstallScript("http://127.0.0.1:8001", "token-value", "tunnel-1")
	cmd := exec.Command("bash", "-n")
	cmd.Stdin = strings.NewReader(script)
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("invalid install script: %v\n%s", err, output)
	}
	if !strings.Contains(script, "token-value") {
		t.Fatal("script does not contain the tunnel token")
	}
}
