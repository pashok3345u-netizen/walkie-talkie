// Рация: клавиши, которые работают поверх игр.
// Следит только за теми клавишами, которые Рация попросила (рация / микрофон),
// и сообщает в программу "down <код>" / "up <код>". Ничего не записывает и никуда не отправляет.
// Во время назначения клавиши ("capture") ждёт одно нажатие и сообщает его код.
// Собирается установщиком встроенным в Windows компилятором (.NET Framework 4).
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;

static class RaciaKeys
{
    [DllImport("user32.dll")]
    static extern short GetAsyncKeyState(int vKey);

    static readonly object Gate = new object();
    static int[] watched = new int[0];
    static bool capturing;
    static volatile bool quit;

    static bool IsDown(int vk) { return (GetAsyncKeyState(vk) & 0x8000) != 0; }

    static void Say(string s)
    {
        Console.Out.WriteLine(s);
        Console.Out.Flush();
    }

    // Commands from Рация, one per line: "watch 86 119", "capture", "cancel".
    static void ReadCommands()
    {
        try
        {
            string line;
            while ((line = Console.In.ReadLine()) != null)
            {
                string[] p = line.Trim().Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                if (p.Length == 0) continue;
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
