# Y86-64 CPU Simulator Visualization

## 快速开始

   ```bash
   cd PJ-Y86-64-Simulator && make
   cd ../backend && ./start.sh
   cd frontend-modified && python3 -m http.server 8085
   http://localhost:8085
   ```

## 功能

- Y86-64 汇编代码编辑
- 实时编译和执行
- 单步调试
- 寄存器/内存/标志位可视化
- 基于C++ CPU 实现
