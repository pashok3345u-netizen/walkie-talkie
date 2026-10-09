// Рация: клавиши, которые работают поверх игр.
// Следит только за теми клавишами, которые Рация попросила (рация / микрофон),
// и сообщает в программу "down <код>" / "up <код>". Ничего не записывает и никуда не отправляет.
// Во время назначения клавиши ("capture") ждёт одно нажатие и сообщает его код.
// По просьбе ("procs", "apps") называет запущенные программы — чтобы показать друзьям, во что ты играешь.
// Только имена программ и заголовки окон: внутрь других программ и игр он не заглядывает.
// Собирается установщиком встроенным в Windows компилятором (.NET Framework 4).
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

static class RaciaKeys
{
    [DllImport("user32.dll")]
    static extern short GetAsyncKeyState(int vKey);

    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
    [DllImport("user32.dll")]
    static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    static extern IntPtr GetWindow(IntPtr hWnd, uint cmd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int max);
    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);

    static readonly object Gate = new object();
    static int[] watched = new int[0];
    static bool capturing;
    static volatile bool quit;

    static bool IsDown(int vk) { return (GetAsyncKeyState(vk) & 0x8000) != 0; }

    // Lines go out in UTF-8 (window titles can be in any language), whole, from two threads.
    static readonly object OutGate = new object();
    static readonly StreamWriter Out = new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false));

    static void Say(string s)
    {
        lock (OutGate) { Out.WriteLine(s); Out.Flush(); }
    }

    static string Clean(string s) { return s.Replace('|', '/').Replace('\r', ' ').Replace('\n', ' ').Replace('\t', ' ').Trim(); }

    // Visible main windows that have a title: process id -> title of its first one.
    static Dictionary<uint, string> WindowTitles()
    {
        Dictionary<uint, string> titles = new Dictionary<uint, string>();
        StringBuilder sb = new StringBuilder(256);
        EnumWindows(delegate (IntPtr h, IntPtr l)
        {
            if (!IsWindowVisible(h) || GetWindow(h, 4) != IntPtr.Zero) return true; // 4 = GW_OWNER: skip dialogs
            sb.Length = 0;
            if (GetWindowText(h, sb, 256) <= 0) return true;
            uint pid;
            GetWindowThreadProcessId(h, out pid);
            if (!titles.ContainsKey(pid)) titles[pid] = sb.ToString();
            return true;
        }, IntPtr.Zero);
        return titles;
    }

    // "procs": names of all running programs (lower case, no .exe); java ones with their window title,
    // because Minecraft Java runs as javaw. "apps": only programs with a window, each with its title.
    static void ListProcs(bool apps)
    {
        List<string> items = new List<string>();
        try
        {
            Dictionary<uint, string> titles = WindowTitles();
            Dictionary<string, bool> seen = new Dictionary<string, bool>();
            foreach (Process p in Process.GetProcesses())
            {
                string name;
                uint id;
                try { name = p.ProcessName.ToLowerInvariant(); id = (uint)p.Id; }
                catch (Exception) { continue; }
                finally { p.Dispose(); }
                string title;
                bool hasTitle = titles.TryGetValue(id, out title);
                string item;
                if (apps) { if (!hasTitle) continue; item = name + "=" + Clean(title); }
                else item = hasTitle && (name == "javaw" || name == "java") ? name + "=" + Clean(title) : name;
                if (seen.ContainsKey(item)) continue;
                seen[item] = true;
                items.Add(item);
            }
        }
        catch (Exception) { }
        Say((apps ? "apps " : "procs ") + string.Join("|", items.ToArray()));
    }

    // Commands from Рация, one per line: "watch 86 119", "capture", "cancel", "procs", "apps".
    static void ReadCommands()
    {
        try
        {
            string line;
            while ((line = Console.In.ReadLine()) != null)
            {
                string[] p = line.Trim().Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                if (p.Length == 0) continue;
                if (p[0] == "procs" || p[0] == "apps") { ListProcs(p[0] == "apps"); continue; }
                lock (Gate)
                {
                    if (p[0] == "watch")
                    {
                        List<int> list = new List<int>();
                        for (int i = 1; i < p.Length; i++)
                        {
                            int v;
                            if (int.TryParse(p[i], out v) && v > 0 && v < 255 && !list.Contains(v)) list.Add(v);
                        }
                        watched = list.ToArray();
                    }
                    else if (p[0] == "capture") capturing = true;
                    else if (p[0] == "cancel") capturing = false;
                }
            }
        }
        catch (Exception) { }
        quit = true; // Рация closed: stop too
    }

    static int Main()
    {
        Thread reader = new Thread(ReadCommands);
        reader.IsBackground = true;
        reader.Priority = ThreadPriority.BelowNormal; // the program list must never slow the game down
        reader.Start();

        bool[] held = new bool[256];
        bool[] before = new bool[256];
        bool wasCapturing = false;
        int[] lastWatched = null;
        Say("ready");

        while (!quit)
        {
            int[] w;
            bool cap;
            lock (Gate) { w = watched; cap = capturing; }

            // A newly watched key that is already held must not fire at once.
            if (!ReferenceEquals(w, lastWatched))
            {
                for (int i = 0; i < w.Length; i++) held[w[i]] = IsDown(w[i]);
                lastWatched = w;
            }

            if (cap)
            {
                if (!wasCapturing)
                {
                    for (int v = 1; v < 255; v++) before[v] = IsDown(v);
                    wasCapturing = true;
                }
                // 1 and 2 are the left/right mouse buttons: never bindable.
                // 0x10-0x12 are "any Shift/Ctrl/Alt": the left/right variants are used instead.
                for (int v = 3; v < 255; v++)
                {
                    if (v == 0x10 || v == 0x11 || v == 0x12) continue;
                    bool d = IsDown(v);
                    if (d && !before[v])
                    {
                        lock (Gate) { capturing = false; }
                        wasCapturing = false;
                        Say("captured " + v);
                        break;
                    }
                    before[v] = d;
                }
            }
            else wasCapturing = false;

            for (int i = 0; i < w.Length; i++)
            {
                int v = w[i];
                bool d = IsDown(v);
                if (d != held[v])
                {
                    held[v] = d;
                    Say((d ? "down " : "up ") + v);
                }
            }
            Thread.Sleep(cap ? 15 : 8);
        }
        return 0;
    }
}
